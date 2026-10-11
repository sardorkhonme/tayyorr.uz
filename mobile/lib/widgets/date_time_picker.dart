import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

Widget _themed(BuildContext context, Widget? child) => Theme(
      data: Theme.of(context).copyWith(
        colorScheme: AppColors.isLight
            ? const ColorScheme.light(primary: AppColors.indigo)
            : ColorScheme.dark(primary: AppColors.indigo, surface: AppColors.surface),
      ),
      child: MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );

/// Muddat tanlash: avval sana, keyin vaqt (24 soatlik). Bekor qilinsa — null.
Future<DateTime?> pickDateTime(BuildContext context, {DateTime? initial}) async {
  // serverdan UTC keladi — tanlagich telefonning mahalliy vaqtida ishlaydi
  initial = initial?.toLocal();
  final now = DateTime.now();
  final init = initial != null && initial.isAfter(now) ? initial : now.add(const Duration(days: 3));
  final date = await showDatePicker(
    context: context,
    initialDate: init,
    firstDate: DateTime(now.year, now.month, now.day),
    lastDate: now.add(const Duration(days: 365)),
    helpText: 'Sanani tanlang',
    cancelText: 'Bekor',
    confirmText: 'Keyingisi',
    builder: _themed,
  );
  if (date == null || !context.mounted) return null;
  final time = await showTimePicker(
    context: context,
    initialTime: initial != null && initial.isAfter(now)
        ? TimeOfDay.fromDateTime(initial)
        : const TimeOfDay(hour: 18, minute: 0),
    helpText: 'Vaqtni tanlang',
    cancelText: 'Bekor',
    confirmText: 'Tayyor',
    builder: _themed,
  );
  if (time == null) return null;
  return DateTime(date.year, date.month, date.day, time.hour, time.minute);
}
