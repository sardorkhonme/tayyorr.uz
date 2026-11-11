import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Har qanday xavfli/qaytarib bo'lmas amal oldidan tasdiq so'raydigan
/// yagona dialog uslubi (bekor qilish, o'chirish, chiqish, bloklash va h.k.).
Future<bool?> confirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'Ha',
  String cancelLabel = "Yöq",
}) {
  return showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: AppColors.surface,
      title: Text(title, style: TextStyle(color: AppColors.textPrimary)),
      content: Text(message, style: const TextStyle(color: AppColors.textMuted)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(cancelLabel)),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: Text(confirmLabel, style: const TextStyle(color: AppColors.red)),
        ),
      ],
    ),
  );
}
