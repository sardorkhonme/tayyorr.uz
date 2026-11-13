import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Token — xavfsiz (shifrlangan) saqlashda; oddiy bayroqlar (masalan
/// "tanishtiruvni ko'rdimi") — Hive'da, chunki ular sir emas.
class LocalStorage {
  LocalStorage._();
  static final LocalStorage instance = LocalStorage._();

  static const _tokenKey = 'auth_token';
  static const _flagsBox = 'flags';
  static const _seenOnboardingKey = 'seen_onboarding';
  static const _themeKey = 'theme';
  static const _userKey = 'cached_user';

  final _secure = const FlutterSecureStorage();
  Box? _box;

  Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox(_flagsBox);
  }

  Future<void> saveToken(String token) =>
      _secure.write(key: _tokenKey, value: token);

  /// Tokenni o'qish. Ba'zi telefonlarda (qayta o'rnatish / zaxiradan tiklash)
  /// shifrlangan xotira o'qilmay xato beradi yoki osilib qoladi — bunda
  /// ilova logoda qotib qolmasligi uchun xotirani tozalab, "kirmagan" deb qaytaramiz.
  Future<String?> readToken() async {
    try {
      return await _secure
          .read(key: _tokenKey)
          .timeout(const Duration(seconds: 5));
    } catch (_) {
      try {
        await _secure.deleteAll();
      } catch (_) {}
      return null;
    }
  }

  Future<void> clearToken() async {
    try {
      await _secure.delete(key: _tokenKey);
    } catch (_) {}
    await _box?.delete(_userKey);
  }

  /// Oxirgi ma'lum profil (JSON) — ilova internetni kutmasdan darhol ochilishi uchun.
  String? get cachedUserJson => _box?.get(_userKey) as String?;
  Future<void> setCachedUserJson(String json) async =>
      _box?.put(_userKey, json);

  bool get hasSeenOnboarding =>
      _box?.get(_seenOnboardingKey, defaultValue: false) as bool;
  Future<void> setSeenOnboarding() => _box!.put(_seenOnboardingKey, true);

  /// Ilova ochilishida serverdan javob kutmasdan darhol to'g'ri mavzuni
  /// ko'rsatish uchun — oxirgi bilingan qiymat mahalliy keshda saqlanadi.
  /// Bildirişnoma ruxsati so'ralgan oxirgi vaqt ("Keyinroq" — 3 kundan keyin yana so'raladi).
  DateTime? get notifPromptAt {
    final v = _box?.get('notifPromptAt') as int?;
    return v == null ? null : DateTime.fromMillisecondsSinceEpoch(v);
  }

  Future<void> setNotifPromptAt(DateTime t) async =>
      _box?.put('notifPromptAt', t.millisecondsSinceEpoch);

  /// Tayyorr SMM qo'llanmasi o'qilganmi (saytdagi "smm-guide-read" kabi).
  bool get smmGuideRead =>
      _box?.get('smmGuideRead', defaultValue: false) as bool? ?? false;
  Future<void> setSmmGuideRead() async => _box?.put('smmGuideRead', true);

  /// Xabar yuboriş ovozi (profil → sozlamalar). Standart — yoqilgan.
  bool get sendSound =>
      _box?.get('sendSound', defaultValue: true) as bool? ?? true;
  Future<void> setSendSound(bool v) async => _box?.put('sendSound', v);

  /// tayyorr+ dagi guruh kartasi ko'rinadimi (admin sozlamasi; oxirgi javob — sakramasligi uchun).
  bool get familyHub =>
      _box?.get('familyHub', defaultValue: true) as bool? ?? true;
  Future<void> setFamilyHub(bool v) async => _box?.put('familyHub', v);

  /// Çatda oxirgi turgan joy: langar xabar id'si va uning röyxat pastki çetidan masofasi (px);
  /// [bottom] — eng pastda edi. Kalit — suhbat id'si yoki `family:uid`.
  ({String? id, double dy, bool bottom})? chatPosition(String chat) {
    final v = _box?.get('chatPos:$chat');
    if (v is! Map) return null;
    return (
      id: v['id'] as String?,
      dy: (v['dy'] as num?)?.toDouble() ?? 0,
      bottom: v['bottom'] == true,
    );
  }

  Future<void> setChatPosition(
    String chat, {
    String? id,
    double dy = 0,
    bool bottom = false,
  }) async =>
      _box?.put('chatPos:$chat', {'id': id, 'dy': dy, 'bottom': bottom});

  String? get cachedTheme => _box?.get(_themeKey) as String?;
  Future<void> setCachedTheme(String theme) => _box!.put(_themeKey, theme);
}
