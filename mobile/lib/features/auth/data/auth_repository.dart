import 'dart:convert';
import 'dart:typed_data';

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/local_storage.dart';
import 'user_model.dart';

class AuthRepository {
  final _api = ApiClient.instance;
  final _storage = LocalStorage.instance;
  final _google = GoogleSignIn(
    serverClientId: kGoogleServerClientId,
    scopes: const ['email'],
  );

  static const _birthdayScope =
      'https://www.googleapis.com/auth/user.birthday.read';

  Future<bool> _birthdayScopeEnabled() async {
    try {
      final res = await _api.get('/mobile/config');
      return res['googleBirthdayScope'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Serverdan kelgan foydalanuvchini keshlab, modelga aylantiradi.
  UserModel _user(Map<String, dynamic> res) {
    final json = res['user'] as Map<String, dynamic>;
    _storage.setCachedUserJson(jsonEncode(json));
    return UserModel.fromJson(json);
  }

  Future<UserModel> login({
    required String login,
    required String password,
  }) async {
    final res = await _api.post(
      '/mobile/auth/login',
      data: {'login': login, 'password': password},
    );
    final token = res['token'];
    if (token is! String || token.isEmpty) {
      throw ApiException("Kiriş yakunlanmadi — qayta urinib köring");
    }
    await _storage.saveToken(token);
    return _user(res);
  }

  /// Google: 1-qadam — hisob tanlaş oynasi. Foydalanuvçi bekor qilsa `null` (xato emas).
  /// Google xatolari (tarmoq, sozlama) tuşunarli [ApiException] ga aylanadi.
  Future<GoogleSignInAccount?> pickGoogleAccount() async {
    try {
      return await _google.signIn();
    } on PlatformException catch (e) {
      if (e.code == 'sign_in_canceled' || e.code == 'canceled') return null;
      throw ApiException(
        e.code == 'network_error'
            ? ApiException.offlineMessage
            : "Google orqali kirib bölmadi — qayta urinib köring",
        network: e.code == 'network_error',
      );
    }
  }

  /// Google: 2-qadam (hisob tanlangandan keyin) — token olib, serverda kiriş. Har bir bosqiç
  /// vaqt bilan çeklangan: heç qaysi biri «qotib» qolmaydi.
  Future<UserModel> finishGoogleSignIn(GoogleSignInAccount account) async {
    final GoogleSignInAuthentication googleAuth;
    try {
      googleAuth = await account.authentication.timeout(
        const Duration(seconds: 20),
      );
    } on TimeoutException {
      throw ApiException(ApiException.slowMessage, network: true);
    } on PlatformException catch (e) {
      throw ApiException(
        e.code == 'network_error'
            ? ApiException.offlineMessage
            : "Googleʼdan maʼlumot olinmadi — qayta urinib köring",
        network: e.code == 'network_error',
      );
    }
    final idToken = googleAuth.idToken;
    if (idToken == null) {
      throw ApiException("Googleʼdan token olinmadi — qayta urinib köring");
    }

    // Tug'ilgan kun ruxsati serverda yoqilgan bo'lsa — qo'shimcha so'raymiz
    // (rad etilsa, xato bo'lsa yoki javob kelmasa ham kirish davom etadi).
    String? accessToken;
    try {
      final enabled = await _birthdayScopeEnabled().timeout(
        const Duration(seconds: 6),
        onTimeout: () => false,
      );
      if (enabled) {
        final granted = await _google
            .requestScopes(const [_birthdayScope])
            .timeout(const Duration(seconds: 60), onTimeout: () => false);
        if (granted) {
          accessToken = (await account.authentication.timeout(
            const Duration(seconds: 15),
          )).accessToken;
        }
      }
    } catch (_) {
      accessToken = null;
    }

    final res = await _api
        .post(
          '/mobile/auth/google',
          data: {
            'idToken': idToken,
            if (accessToken != null) 'accessToken': accessToken,
          },
        )
        .timeout(
          const Duration(seconds: 30),
          onTimeout: () =>
              throw ApiException(ApiException.slowMessage, network: true),
        );
    final token = res['token'];
    if (token is! String || token.isEmpty) {
      throw ApiException("Kiriş yakunlanmadi — qayta urinib köring");
    }
    await _storage.saveToken(token);
    return _user(res);
  }

  /// Email bilan ro'yxatdan o'tish (1-qadam): emailga 4 xonali kod. Kod tayyorr+ da yuboriladi
  /// (Brevo o'sha yerda). Qaytaradi: qayta yuborishgacha soniya.
  Future<int> sendEmailCode(String email) async {
    final res = await _api.post(
      '$kPlusUrl/api/mobile/email/send',
      data: {'email': email},
    );
    return (res['waitSec'] as num?)?.toInt() ?? 60;
  }

  /// 2-qadam: kod to'g'ri bo'lsa tayyorr+ qisqa chipta beradi — u app'da mobil tokenga almashtiriladi.
  Future<UserModel> verifyEmailCode(String email, String code) async {
    final r = await _api.post(
      '$kPlusUrl/api/mobile/email/verify',
      data: {'email': email, 'code': code},
    );
    final res = await _api.post(
      '/mobile/auth/email',
      data: {'ticket': r['ticket']},
    );
    await _storage.saveToken(res['token'] as String);
    return _user(res);
  }

  /// Parolni tiklash (1): emailga 4 xonali kod (hisob bo'lmasa ham "yuborildi" deyiladi).
  Future<int> sendResetCode(String email) async {
    final res = await _api.post(
      '$kPlusUrl/api/mobile/password/send',
      data: {'email': email},
    );
    return (res['waitSec'] as num?)?.toInt() ?? 60;
  }

  /// Parolni tiklash (2): kod + yangi parol.
  Future<void> resetPassword(String email, String code, String password) async {
    await _api.post(
      '$kPlusUrl/api/mobile/password/reset',
      data: {'email': email, 'code': code, 'password': password},
    );
  }

  /// Google bilan birinchi marta kirgan foydalanuvchi uchun profilni
  /// tugallash (rol, login, parol).
  Future<UserModel> completeOnboarding({
    required String role,
    required String firstName,
    required String lastName,
    required String login,
    required String password,
    required String about,
    required String birthDate,
    String? hearAboutUs,
    String? hearAboutUsDetail,
  }) async {
    final res = await _api.post(
      '/mobile/onboarding',
      data: {
        'birthDate': birthDate,
        'role': role,
        'acceptTerms': true,
        'firstName': firstName,
        'lastName': lastName,
        'login': login,
        'password': password,
        'about': about,
        if (hearAboutUs != null) 'hearAboutUs': hearAboutUs,
        if (hearAboutUsDetail != null) 'hearAboutUsDetail': hearAboutUsDetail,
      },
    );
    return _user(res);
  }

  /// tayyorr+ da ro'yxatdan o'tgan (login bor, rol yo'q) hisob — faqat rol tanlash.
  Future<UserModel> chooseRole(String role) async {
    final res = await _api.post(
      '/mobile/onboarding/role',
      data: {'role': role},
    );
    return _user(res);
  }

  /// Saqlangan token bormi (xatoga chidamli).
  Future<String?> readToken() => _storage.readToken();

  /// Oxirgi saqlangan profil — internetsiz ham darhol ochish uchun.
  UserModel? cachedUser() {
    final raw = _storage.cachedUserJson;
    if (raw == null) return null;
    try {
      return UserModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<UserModel> refreshMe() async {
    final res = await _api.get('/mobile/me');
    return _user(res);
  }

  Future<UserModel> updateProfile({
    required String firstName,
    required String lastName,
    required String about,
    String? birthDate,
  }) async {
    final res = await _api.patch(
      '/mobile/me',
      data: {
        'firstName': firstName,
        'lastName': lastName,
        'about': about,
        if (birthDate != null) 'birthDate': birthDate,
      },
    );
    return _user(res);
  }

  /// Profil rasmini yuklaydi: R2'ga to'g'ridan PUT qiladi, so'ng profilni
  /// yangi rasm bilan yangilaydi.
  Future<UserModel> uploadAvatar({
    required Uint8List bytes,
    required String filename,
    required String contentType,
  }) async {
    final presign = await _api.post(
      '/mobile/upload/avatar-presign',
      data: {'filename': filename, 'contentType': contentType},
    );
    final uploadUrl = presign['uploadUrl'] as String;
    final avatarUrl = presign['publicUrl'] as String;

    // R2'ga to'g'ridan yuklaymiz — bizning Bearer tokenimiz kerak emas,
    // shuning uchun asosiy ApiClient emas, alohida oddiy Dio ishlatamiz.
    await Dio(kUploadOptions).put(
      uploadUrl,
      data: bytes,
      options: Options(headers: {'Content-Type': contentType}),
    );

    final res = await _api.patch('/mobile/me', data: {'avatarUrl': avatarUrl});
    return _user(res);
  }

  /// Username (login) va/yoki parolni tahrirlash — eski parol shart emas.
  Future<UserModel> updateAccount({String? login, String? newPassword}) async {
    await _api.patch(
      '/mobile/me/account',
      data: {
        if (login != null && login.isNotEmpty) 'login': login,
        if (newPassword != null && newPassword.isNotEmpty)
          'newPassword': newPassword,
      },
    );
    return refreshMe();
  }

  Future<void> logout() async {
    await _storage.clearToken();
    try {
      await _google.signOut();
    } catch (_) {
      // jim — Google sessiyasi bo'lmasligi mumkin
    }
  }
}
