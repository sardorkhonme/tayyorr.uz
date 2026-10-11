import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';
import 'swipe_back_transitions.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark => _build(isLight: false);
  static ThemeData get light => _build(isLight: true);

  static ThemeData _build({required bool isLight}) {
    final headingFont = GoogleFonts.spaceGrotesk();
    final bodyFont = GoogleFonts.inter();

    final base = isLight ? ThemeData.light(useMaterial3: true) : ThemeData.dark(useMaterial3: true);

    return base.copyWith(
      // web/kompyuterda Flutter avtomatik 'compact' zichlik qo'llab input va
      // tugmalarni qisqartiradi — telefondagi bilan bir xil bo'lishi uchun.
      visualDensity: VisualDensity.standard,
      scaffoldBackgroundColor: AppColors.bg,
      colorScheme: base.colorScheme.copyWith(
        primary: AppColors.indigo,
        secondary: AppColors.violet,
        surface: AppColors.surface,
        error: AppColors.red,
      ),
      textTheme: base.textTheme
          .apply(
            bodyColor: AppColors.textPrimary,
            displayColor: AppColors.textPrimary,
            fontFamily: bodyFont.fontFamily,
          )
          .copyWith(
            displayLarge: headingFont.copyWith(
              color: AppColors.textPrimary,
              fontSize: 34,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
            headlineLarge: headingFont.copyWith(
              color: AppColors.textPrimary,
              fontSize: 26,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
            ),
            headlineMedium: headingFont.copyWith(
              color: AppColors.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
            titleLarge: headingFont.copyWith(
              color: AppColors.textPrimary,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        foregroundColor: AppColors.textPrimary,
      ),
      // Saytdagi `.input` bilan bir xil: 11.2px burchak, nozik chegara.
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        isDense: true,
        fillColor: isLight ? Colors.white : Colors.white.withValues(alpha: 0.04),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12.8, vertical: 9.6),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11.2),
          borderSide: BorderSide(color: isLight ? Colors.black.withValues(alpha: 0.14) : Colors.white.withValues(alpha: 0.10)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11.2),
          borderSide: BorderSide(color: isLight ? Colors.black.withValues(alpha: 0.14) : Colors.white.withValues(alpha: 0.10)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11.2),
          borderSide: const BorderSide(color: AppColors.indigo),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11.2),
          borderSide: const BorderSide(color: AppColors.red),
        ),
        hintStyle: const TextStyle(color: Color(0xFF71717A), fontSize: 14),
        labelStyle: TextStyle(color: AppColors.textSecondary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: isLight ? const Color(0xFF18181B) : Colors.white,
          foregroundColor: isLight ? Colors.white : Colors.black,
          disabledBackgroundColor: (isLight ? const Color(0xFF18181B) : Colors.white).withValues(alpha: 0.3),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 15.5,
          ),
        ),
      ),
      // ElevatedButton bilan bir xil balandlik/burchak — aks holda
      // qatorma-qator turganda ikkisi turlicha ko'rinadi (masalan
      // shartnomani "qabul qilish"/"rad etish" tugmalari).
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          side: BorderSide(color: AppColors.cardBorder),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 15.5,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.textSecondary,
        ),
      ),
      dividerTheme: DividerThemeData(color: AppColors.cardBorder),
      // ichki sahifalardan chapdan o'ngga surib qaytish (Telegram kabi)
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: SwipeBackPageTransitionsBuilder(),
          TargetPlatform.iOS: SwipeBackPageTransitionsBuilder(),
        },
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.indigo,
        unselectedItemColor: AppColors.textFaint,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
      ),
    );
  }
}
