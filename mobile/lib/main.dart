import 'package:flutter/material.dart';

import 'app.dart';
import 'core/notifications/message_notifier.dart';
import 'core/storage/local_storage.dart';
import 'core/theme/theme_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalStorage.instance.init();
  ThemeController.instance.loadCached();
  // kutmaymiz — bildirishnoma tayyorlanishi ilova ochilishini to'xtatmasin
  MessageNotifier.instance.init();
  runApp(const TayyorrApp());
}
