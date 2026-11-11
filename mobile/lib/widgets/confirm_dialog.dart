import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';

import '../core/ui/app_dialogs.dart';

/// Har qanday xavfli/qaytarib bo'lmas amal oldidan tasdiq so'raydigan
/// yagona oyna (bekor qilish, o'chirish, chiqish, bloklash va h.k.) — zamonaviy uslub (core/ui/app_dialogs.dart).
Future<bool?> confirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'Ha',
  String cancelLabel = "Yöq",
  TIData? icon,
  bool? danger,
}) {
  final isDanger = danger ?? RegExp(r'öçir|çiq|blok|bekor|rad|örtaga', caseSensitive: false).hasMatch('$confirmLabel $title');
  return showAppConfirm(
    context,
    title: title,
    message: message,
    confirmLabel: confirmLabel,
    cancelLabel: cancelLabel,
    icon: icon,
    danger: isDanger,
  );
}
