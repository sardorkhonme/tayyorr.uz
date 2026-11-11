import 'package:flutter/foundation.dart';

import 'app_info.dart';
import 'network/api_client.dart';

/// Ilova yangilanishi haqida server ma'lumoti (admin → Mobil ilova).
class UpdateInfo {
  final String min;
  final int minBuild;
  final String latest;
  final int latestBuild;
  final String apkUrl;
  final String notes;

  const UpdateInfo({
    this.min = '',
    this.minBuild = 0,
    this.latest = '',
    this.latestBuild = 0,
    this.apkUrl = '',
    this.notes = '',
  });

  factory UpdateInfo.fromJson(Map<String, dynamic> j) => UpdateInfo(
        min: j['min'] as String? ?? '',
        minBuild: (j['minBuild'] as num?)?.toInt() ?? 0,
        latest: j['latest'] as String? ?? '',
        latestBuild: (j['latestBuild'] as num?)?.toInt() ?? 0,
        apkUrl: j['apkUrl'] as String? ?? '',
        notes: j['notes'] as String? ?? '',
      );
}

/// Serverdagi umumiy sozlamalar: star narxi, ariza uchun minimal star, ilova yangilanishi,
/// texnik ishlar rejimi. Ilova ochilganda va fondan qaytganda yangilanadi.
class AppConfig extends ChangeNotifier {
  AppConfig._();
  static final instance = AppConfig._();

  int starPrice = 2000;
  int minOfferStars = 2;
  String versionLabel = '';
  UpdateInfo update = const UpdateInfo();

  /// Server 426 qaytardi — bu versiya bilan ishlab bo'lmaydi.
  bool _forced = false;

  /// Texnik ishlar rejimi (server 503 + maintenance) — xabar matni.
  String? maintenance;

  bool _loading = false;

  /// Majburiy yangilanish: o'rnatilgan build admin belgilagan minimaldan past.
  bool get mustUpdate => _forced || (update.minBuild > 0 && AppInfo.build < update.minBuild);

  /// Yangiroq versiya bor (majburiy emas).
  bool get hasUpdate => update.latestBuild > AppInfo.build && update.apkUrl.isNotEmpty;

  Future<void> load() async {
    if (_loading) return;
    _loading = true;
    try {
      final r = await ApiClient.instance.get('/mobile/config');
      starPrice = (r['starPrice'] as num?)?.toInt() ?? starPrice;
      minOfferStars = (r['minOfferStars'] as num?)?.toInt() ?? minOfferStars;
      versionLabel = (r['versionLabel'] as String? ?? '').trim();
      if (r['update'] is Map<String, dynamic>) update = UpdateInfo.fromJson(r['update'] as Map<String, dynamic>);
      notifyListeners();
    } catch (_) {
      /* tarmoq yo'q — oldingi qiymatlar qoladi */
    } finally {
      _loading = false;
    }
  }

  /// "Yangilanishlarni tekshirish" — yangi versiya bo'lsa oynani qayta ko'rsatish uchun.
  int promptTick = 0;

  /// Serverdan qayta so'raydi; yangi versiya bo'lsa — true (oyna "Keyinroq" bosilgan bo'lsa ham qayta chiqadi).
  Future<bool> checkForUpdate() async {
    await load();
    if (hasUpdate || mustUpdate) {
      promptTick++;
      notifyListeners();
      return true;
    }
    return false;
  }

  /// ApiClient chaqiradi: server "bu versiya eskirgan" dedi.
  void markUpdateRequired() {
    if (_forced) return;
    _forced = true;
    notifyListeners();
    load();
  }

  /// ApiClient chaqiradi: texnik ishlar (null — tugadi).
  void setMaintenance(String? message) {
    if (maintenance == message) return;
    maintenance = message;
    notifyListeners();
  }
}
