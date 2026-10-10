import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
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

  static const _birthdayScope = 'https://www.googleapis.com/auth/user.birthday.read';

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
    final res = await _api.post('/mobile/auth/login', data: {
      'login': login,
      'password': password,
    });
    await _storage.saveToken(res['token'] as String);
    return _user(res);
  }

  /// Google orqali kirish/ro'yxatdan o'tish. Foydalanuvchi hisob tanlashni
  /// bekor qilsa `null` qaytaradi (xato emas).
  Future<UserModel?> signInWithGoogle() async {
    final account = await _google.signIn();
    if (account == null) return null;

    final googleAuth = await account.authentication;
    final idToken = googleAuth.idToken;
    if (idToken == null) {
      throw ApiException("Google'dan token olinmadi — qayta urinib ko'ring");
    }

    // Tug'ilgan kun ruxsati serverda yoqilgan bo'lsa — qo'shimcha so'raymiz
    // (rad etilsa ham kirish davom etadi).
    String? accessToken;
    if (await _birthdayScopeEnabled()) {
      final granted = await _google.requestScopes(const [_birthdayScope]).catchError((_) => false);
      if (granted) accessToken = (await account.authentication).accessToken;
    }

    final res = await _api.post('/mobile/auth/google', data: {
      'idToken': idToken,
      if (accessToken != null) 'accessToken': accessToken,
    });
    await _storage.saveToken(res['token'] as String);
    return _user(res);
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
  }) async {
    final res = await _api.post('/mobile/onboarding', data: {
      'birthDate': birthDate,
      'role': role,
      'acceptTerms': true,
      'firstName': firstName,
      'lastName': lastName,
      'login': login,
      'password': password,
      'about': about,
    });
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
    final res = await _api.patch('/mobile/me', data: {
      'firstName': firstName,
      'lastName': lastName,
      'about': about,
      if (birthDate != null) 'birthDate': birthDate,
    });
    return _user(res);
  }

  /// Profil rasmini yuklaydi: R2'ga to'g'ridan PUT qiladi, so'ng profilni
  /// yangi rasm bilan yangilaydi.
  Future<UserModel> uploadAvatar({
    required Uint8List bytes,
    required String filename,
    required String contentType,
  }) async {
    final presign = await _api.post('/mobile/upload/avatar-presign', data: {
      'filename': filename,
      'contentType': contentType,
    });
    final uploadUrl = presign['uploadUrl'] as String;
    final avatarUrl = presign['publicUrl'] as String;

    // R2'ga to'g'ridan yuklaymiz — bizning Bearer tokenimiz kerak emas,
    // shuning uchun asosiy ApiClient emas, alohida oddiy Dio ishlatamiz.
    await Dio().put(
      uploadUrl,
      data: bytes,
      options: Options(headers: {'Content-Type': contentType}),
    );

    final res = await _api.patch('/mobile/me', data: {'avatarUrl': avatarUrl});
    return _user(res);
  }

  /// Username (login) va/yoki parolni tahrirlash — eski parol shart emas.
  Future<UserModel> updateAccount({String? login, String? newPassword}) async {
    await _api.patch('/mobile/me/account', data: {
      if (login != null && login.isNotEmpty) 'login': login,
      if (newPassword != null && newPassword.isNotEmpty) 'newPassword': newPassword,
    });
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
