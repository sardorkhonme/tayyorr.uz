import 'package:flutter/material.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/liquid_glass.dart';
import '../../../widgets/web_ui.dart';

/// Header qatori örniga çiqadigan qidiruv maydoni: çapda yopiş (ortga) tugmasi,
/// öngda şişa kapsula ičida matn maydoni. Balandligi header ikonkalari bilan bir xil (48).
class HeaderSearchField extends StatelessWidget {
  const HeaderSearchField({
    super.key,
    required this.controller,
    required this.hint,
    required this.onChanged,
    required this.onClose,
  });

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    const h = 48.0;
    return Row(
      children: [
        GlassTap(
          height: h,
          width: h,
          onTap: onClose,
          semanticLabel: 'Qidiruvni yopiş',
          child: TIcon(
            TI.arrow_back_ios_new_rounded,
            size: 19,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: LiquidGlass(
            height: h,
            borderRadius: BorderRadius.circular(h / 2),
            child: Row(
              children: [
                const SizedBox(width: 16),
                TIcon(TI.search_rounded, size: 19, color: WebC.zinc500),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: controller,
                    autofocus: true,
                    onChanged: onChanged,
                    textInputAction: TextInputAction.search,
                    cursorColor: AppColors.indigo,
                    style: TextStyle(color: WebC.white, fontSize: 15),
                    decoration: InputDecoration(
                      isCollapsed: true,
                      border: InputBorder.none,
                      hintText: hint,
                      hintMaxLines: 1,
                      hintStyle: TextStyle(color: WebC.zinc500, fontSize: 15),
                    ),
                  ),
                ),
                ValueListenableBuilder<TextEditingValue>(
                  valueListenable: controller,
                  builder: (context, v, _) => v.text.isEmpty
                      ? const SizedBox(width: 16)
                      : IconButton(
                          tooltip: 'Tozalaş',
                          onPressed: () {
                            controller.clear();
                            onChanged('');
                          },
                          icon: TIcon(
                            TI.close_rounded,
                            size: 18,
                            color: WebC.zinc500,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Header ikonkasi ostida oçiladigan şişa menyu (filtr). [anchor] — ikonkalar guruhining konteksti:
/// menyu uning öng çetiga tekislanib, 8px pastda çiqadi.
Future<void> showHeaderDropdown(
  BuildContext anchor, {
  required Widget Function(BuildContext context, StateSetter setMenu) builder,
}) {
  final box = anchor.findRenderObject() as RenderBox?;
  final screen = MediaQuery.sizeOf(anchor);
  final pad = MediaQuery.paddingOf(anchor);
  final rect = box != null && box.hasSize
      ? box.localToGlobal(Offset.zero) & box.size
      : Rect.fromLTWH(screen.width - 12, pad.top + 12, 0, 48);
  final top = rect.bottom + 8;
  final right = (screen.width - rect.right).clamp(12.0, screen.width);
  final width = (screen.width - 24).clamp(0.0, 340.0);
  final maxH = screen.height - top - pad.bottom - 24;
  return showGeneralDialog(
    context: anchor,
    barrierDismissible: true,
    barrierLabel: 'Yopiş',
    barrierColor: Colors.black.withValues(
      alpha: AppColors.isLight ? 0.10 : 0.35,
    ),
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (context, _, _) => Stack(
      children: [
        Positioned(
          top: top,
          right: right,
          width: width,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxH),
            child: Material(
              type: MaterialType.transparency,
              child: LiquidGlass(
                panel: true,
                borderRadius: BorderRadius.circular(24),
                child: StatefulBuilder(builder: builder),
              ),
            ),
          ),
        ),
      ],
    ),
    transitionBuilder: (context, a, _, child) {
      final c = CurvedAnimation(parent: a, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: c,
        child: ScaleTransition(
          alignment: Alignment.topRight,
          scale: Tween(begin: 0.92, end: 1.0).animate(c),
          child: child,
        ),
      );
    },
  );
}

/// Menyu tarkibi: sarlavha, bölimlar (scroll) va pastki qator (tozalaş + natija soni).
class DropdownPanel extends StatelessWidget {
  const DropdownPanel({
    super.key,
    required this.title,
    required this.sections,
    required this.resultLabel,
    this.onReset,
  });

  final String title;
  final List<Widget> sections;
  final String resultLabel;

  /// null — tozalaşga hojat yöq (hammasi standart holatda).
  final VoidCallback? onReset;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: WebC.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.of(context).pop(),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: TIcon(TI.close_rounded, size: 18, color: WebC.zinc500),
                ),
              ),
            ],
          ),
        ),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < sections.length; i++) ...[
                  if (i > 0) const SizedBox(height: 16),
                  sections[i],
                ],
              ],
            ),
          ),
        ),
        Container(
          height: 1,
          margin: const EdgeInsets.only(top: 8),
          color: WebC.border,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
          child: Row(
            children: [
              Opacity(
                opacity: onReset == null ? 0.4 : 1,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onReset,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'Tozalaş',
                      style: TextStyle(
                        color: WebC.zinc400,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
              const Spacer(),
              WebButton(
                label: resultLabel,
                small: true,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Menyu bölimi: kiçik sarlavha + chiplar.
class DropdownSection extends StatelessWidget {
  const DropdownSection({super.key, required this.title, required this.chips});
  final String title;
  final List<Widget> chips;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: TextStyle(
            color: WebC.zinc500,
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: chips),
      ],
    );
  }
}

/// Bir xil ölçamdagi tanlov chipi (32px balandlik) — tanlanganda indigo.
class DropdownChip extends StatelessWidget {
  const DropdownChip({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? WebC.indigoFill : WebC.fill5,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active ? const Color(0xFF818CF8) : WebC.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (active) ...[
              TIcon(TI.check_rounded, size: 14, color: WebC.indigo),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              maxLines: 1,
              style: TextStyle(
                color: active ? WebC.white : WebC.zinc300,
                fontSize: 13,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Faol filtrlar qatori (olib taşlanadigan chiplar) — royxat ustida.
class ActiveFilterChips extends StatelessWidget {
  const ActiveFilterChips({
    super.key,
    required this.items,
    required this.onClearAll,
  });

  final List<(String, VoidCallback)> items;
  final VoidCallback onClearAll;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final it in items)
          GestureDetector(
            onTap: it.$2,
            child: Container(
              height: 28,
              padding: const EdgeInsets.only(left: 12, right: 8),
              decoration: BoxDecoration(
                color: WebC.indigoFill,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    it.$1,
                    style: TextStyle(
                      color: WebC.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 4),
                  TIcon(TI.close_rounded, size: 14, color: WebC.zinc400),
                ],
              ),
            ),
          ),
        GestureDetector(
          onTap: onClearAll,
          child: SizedBox(
            height: 28,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'Tozalaş',
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
