import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import 'app.dart';
import 'core/app_config.dart';
import 'core/app_info.dart';
import 'core/notifications/message_notifier.dart';
import 'core/storage/local_storage.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/theme_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalStorage.instance.init();
  // versiya (APK ichidan) — har so'rovda serverga yuboriladi
  await AppInfo.load();
  // star narxi, yangilanish — kutmaymiz
  AppConfig.instance.load();
  ThemeController.instance.loadCached();
  // kutmaymiz — bildirishnoma tayyorlanishi ilova ochilishini to'xtatmasin
  MessageNotifier.instance.init();
  // iOS 26 «Liquid Glass» shaderlari (sindirish/linza) — faqat diskdan xotiraga yuklanadi, ochilishni to'xtatmaydi
  try {
    await LiquidGlassWidgets.initialize(enablePerformanceMonitor: false);
  } catch (_) {
    // shader yuklanmasa ham ilova ochiladi — shisha oddiy blur ko'rinişida chiziladi
  }
  runApp(
    LiquidGlassWidgets.wrap(
      theme: const GlassThemeData.ios26(),
      // qurilma sekin bölsa — sifat avtomatik pasayadi (premium → standard → minimal)
      adaptiveQuality: true,
      // shisha yorug'/qorong'ini ilovaning öz rejimidan oladi (telefon rejimidan emas)
      brightnessResolver: (_) => AppColors.isLight ? Brightness.light : Brightness.dark,
      child: const TayyorrApp(),
    ),
  );
}
