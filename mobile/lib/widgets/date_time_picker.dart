import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

Widget _themed(BuildContext context, Widget? child) {
  final light = AppColors.isLight;
  final surface = light ? Colors.white : const Color(0xFF15151F);
  final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(28));
  final btn = TextButton.styleFrom(
    foregroundColor: const Color(0xFF818CF8),
    textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
  );
  return Theme(
    data: Theme.of(context).copyWith(
      colorScheme: light
          ? const ColorScheme.light(primary: Color(0xFF6366F1), onPrimary: Colors.white, surface: Colors.white)
          : ColorScheme.dark(primary: const Color(0xFF818CF8), onPrimary: Colors.white, surface: surface),
      dialogTheme: DialogThemeData(backgroundColor: surface, shape: shape),
      textButtonTheme: TextButtonThemeData(style: btn),
      datePickerTheme: DatePickerThemeData(
        backgroundColor: surface,
        shape: shape,
        headerBackgroundColor: const Color(0xFF6366F1),
        headerForegroundColor: Colors.white,
        dayShape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
        todayBorder: const BorderSide(color: Color(0xFF8B5CF6), width: 1.5),
      ),
      timePickerTheme: TimePickerThemeData(
        backgroundColor: surface,
        shape: shape,
        hourMinuteShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        dialBackgroundColor: AppColors.tint(0.06),
        dialHandColor: const Color(0xFF6366F1),
      ),
    ),
    child: MediaQuery(
      data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
      child: child!,
    ),
  );
}

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
