import 'package:package_info_plus/package_info_plus.dart';

/// O'rnatilgan ilovaning versiyasi — APK ichida (build paytida pubspec.yaml dan yoziladi),
/// "ma'lumotlarni tozalash"da o'chmaydi, faqat yangi APK o'rnatilganda o'zgaradi.
/// Versiya ikki raqamli: "1.1"; build raqami = katta*100 + kichik (1.1 → 101).
class AppInfo {
  AppInfo._();

  static int build = 0;
  static String version = '';

  static Future<void> load() async {
    try {
      final i = await PackageInfo.fromPlatform().timeout(const Duration(seconds: 3));
      build = int.tryParse(i.buildNumber) ?? 0;
      version = i.version;
    } catch (_) {
      /* aniqlanmasa — 0: server eski ilova deb hisoblaydi */
    }
  }

  /// "1.1.0" → "1.1"
  static String get short {
    final p = version.split('.');
    return p.length >= 2 ? '${p[0]}.${p[1]}' : version;
  }
}
