import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';

import '../core/theme/theme_controller.dart';
import '../core/ui/liquid_glass.dart';

/// Saytdagi ThemeToggle bilan bir xil: quyosh "Yorug'" / oy "Qorong'i".
/// Tanlangan segment — suyuq shisha tabletka (boshqasiga rezinadek oqib o'tadi).
/// `bare` — menyu ichida (ramkasiz).
class ThemeToggle extends StatelessWidget {
  const ThemeToggle({super.key, this.bare = false});

  final bool bare;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeController.instance,
      builder: (context, _) {
        final isLight = ThemeController.instance.isLight;
        return LiquidSegmented(
          framed: !bare,
          height: 38,
          index: isLight ? 0 : 1,
          onChanged: (i) => ThemeController.instance.setLight(i == 0),
          segments: const [
            LiquidSegment(icon: TI.light_mode_rounded, label: 'Yorug\''),
            LiquidSegment(icon: TI.dark_mode_rounded, label: 'Qorong\'i'),
          ],
        );
      },
    );
  }
}
