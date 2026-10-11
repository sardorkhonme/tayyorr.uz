import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Aylana yuklanish ko'rsatkichi, o'rtasida foiz (saytdagi bilan bir xil).
/// [value] null bo'lsa — hajm hali noma'lum, oddiy aylanib turadi.
class ProgressRing extends StatelessWidget {
  const ProgressRing({
    super.key,
    required this.value,
    this.size = 42,
    this.stroke = 3,
    this.color = Colors.white,
    this.trackColor,
    this.showText = true,
  });

  final double? value;
  final double size;
  final double stroke;
  final Color color;
  final Color? trackColor;
  final bool showText;

  @override
  Widget build(BuildContext context) {
    final v = value;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox.expand(
            child: CircularProgressIndicator(
              value: v == null ? null : math.max(0.02, v.clamp(0.0, 1.0)),
              strokeWidth: stroke,
              color: color,
              backgroundColor: trackColor ?? color.withValues(alpha: 0.22),
              strokeCap: StrokeCap.round,
            ),
          ),
          if (showText && v != null)
            Text(
              '${(v.clamp(0.0, 1.0) * 100).round()}%',
              style: TextStyle(
                color: color,
                fontSize: size * 0.24,
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
        ],
      ),
    );
  }
}
