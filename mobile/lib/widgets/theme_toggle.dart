import 'package:flutter/material.dart';

import '../core/theme/theme_controller.dart';
import 'web_ui.dart';

/// Saytdagi ThemeToggle bilan bir xil: "☀️ Yorug'" / "🌙 Qorong'i".
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
        final row = Row(
          children: [
            Expanded(
              child: _Segment(
                emoji: '☀️',
                label: 'Yorug\'',
                selected: isLight,
                onTap: () => ThemeController.instance.setLight(true),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: _Segment(
                emoji: '🌙',
                label: 'Qorong\'i',
                selected: !isLight,
                onTap: () => ThemeController.instance.setLight(false),
              ),
            ),
          ],
        );
        if (bare) return row;
        return Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: WebC.fill5,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: WebC.border),
          ),
          child: row,
        );
      },
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({required this.emoji, required this.label, required this.selected, required this.onTap});
  final String emoji;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? WebC.fill10 : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 12)),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: selected ? WebC.white : WebC.zinc400, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
