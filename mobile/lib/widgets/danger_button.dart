import 'package:tayyorr_app/core/ui/ticons.dart';
import 'dart:ui';

import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Manfiy/xavfli amallar (o'chirish, bekor qilish, bloklash) uchun yagona
/// uslub — qizil matn, xira (blur) shaffof fon, qizil border. Boshqa
/// tugmalar bilan bir xil burchak radiusi (14) ishlatiladi.
class DangerButton extends StatelessWidget {
  const DangerButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.expand = true,
    this.dense = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final TIData? icon;
  final bool expand;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final child = ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Material(
          color: AppColors.red.withValues(alpha: 0.12),
          child: InkWell(
            onTap: onPressed,
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: dense ? 10 : 15),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.red.withValues(alpha: 0.4)),
              ),
              child: Row(
                mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    TIcon(icon, size: 17, color: AppColors.red),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      color: onPressed == null ? AppColors.red.withValues(alpha: 0.4) : AppColors.red,
                      fontSize: dense ? 13 : 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return expand ? SizedBox(width: double.infinity, child: child) : child;
  }
}
