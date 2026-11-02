import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Saytdagi haqiqiy "tayyorr.uz" logotipi: rangli "T" belgisi + yozuv.
/// Yozuv asseti oq rangda chizilgan — yorug' rejimda o'qilishi uchun matn
/// rangiga moslab bo'yaladi; belgi esa o'z ranglarida qoladi.
class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.height = 22, this.showMark = true});

  /// Yozuv balandligi; belgi undan ~1.6 baravar baland.
  final double height;
  final bool showMark;

  @override
  Widget build(BuildContext context) {
    final text = Image.asset(
      'assets/logo.png',
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      color: AppColors.textPrimary,
      colorBlendMode: BlendMode.srcIn,
    );
    if (!showMark) return text;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/logo-mark.png',
          height: height * 1.6,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
        ),
        SizedBox(width: height * 0.35),
        Flexible(child: text),
      ],
    );
  }
}
