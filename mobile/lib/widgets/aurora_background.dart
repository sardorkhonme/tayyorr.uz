import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Sahifa foni — bir tekis rang (qorong'i rejimda töq, yorug' rejimda oç).
/// Gradient / rangli doiralar yöq: kartalar fondan biroz oçroq (yoki töqroq) bölib, matn oson öqiladi.
class AuroraBackground extends StatelessWidget {
  const AuroraBackground({super.key, this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.bg,
      child: child ?? const SizedBox.expand(),
    );
  }
}
