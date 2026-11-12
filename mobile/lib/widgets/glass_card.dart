import 'dart:ui';

import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Saytdagi `.card` / `.glass` uslubiga o'xshab — xira shisha panel.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.blur = true,
  });

  final Widget child;
  final EdgeInsets padding;
  final bool blur;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        // Saytdagi .card bilan bir xil: qorong'ida shaffof shisha,
        // yorug'da esa sahifa fonidan ajralib turadigan qattiq oq.
        color: AppColors.isLight
            ? AppColors.surface
            : Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: child,
    );
    if (!blur) return content;
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: content,
      ),
    );
  }
}
