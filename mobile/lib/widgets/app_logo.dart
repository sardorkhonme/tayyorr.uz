import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme/app_colors.dart';

/// Saytdagi "tayyorr.uz" logotipi: rangli "T" belgisi + "Tayyorr.uz" yozuvi
/// (asosiy shrift — Space Grotesk). Yozuv mavzuga qarab matn rangini oladi.
class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.height = 22, this.showMark = true});

  /// Yozuv balandligi (taxminan shrift o'lchami); belgi undan ~1.5 baravar baland.
  final double height;
  final bool showMark;

  @override
  Widget build(BuildContext context) {
    final text = Text.rich(
      TextSpan(
        text: 'Tayyorr',
        children: const [
          TextSpan(
            text: '.uz',
            style: TextStyle(color: Color(0xFF818CF8)),
          ),
        ],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: GoogleFonts.spaceGrotesk(
        fontSize: height,
        height: 1.1,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.02 * height,
        color: AppColors.textPrimary,
      ),
    );
    if (!showMark) return text;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/logo-mark.png',
          height: height * 1.5,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
        ),
        SizedBox(width: height * 0.35),
        Flexible(child: text),
      ],
    );
  }
}
