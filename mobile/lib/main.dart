import 'package:flutter/material.dart';

import 'app.dart';
import 'core/app_config.dart';
import 'core/app_info.dart';
import 'core/notifications/message_notifier.dart';
import 'core/storage/local_storage.dart';
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
  runApp(const TayyorrApp());
}
