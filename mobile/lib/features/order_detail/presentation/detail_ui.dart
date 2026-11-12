import 'package:flutter/material.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/web_ui.dart';

/// Buyurtma sahifasining yagona ölçamlari: karta ički bösliği 16, burçak 16,
/// tugma balandligi 44, kartalar orasi 16, karta ičidagi elementlar orasi 12.
const double kDetailPad = 16;
const double kDetailGap = 12;
const double kActionHeight = 44;

/// Bölim kartasi: sarlavha (ixtiyoriy ikonka va öngda qöşimça) + tarkib.
/// [tint] berilsa — rangli (şartnoma, ogohlantiriş) variant.
class DetailCard extends StatelessWidget {
  const DetailCard({
    super.key,
    this.title,
    this.icon,
    this.trailing,
    this.tint,
    required this.child,
  });

  final String? title;
  final TIData? icon;
  final Widget? trailing;
  final Color? tint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title != null) ...[
          SizedBox(
            height: 24,
            child: Row(
              children: [
                if (icon != null) ...[
                  TIcon(icon, size: 18, color: tint ?? WebC.zinc400),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    title!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: WebC.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
          const SizedBox(height: kDetailGap),
        ],
        child,
      ],
    );
    if (tint == null) {
      return WebCard(padding: const EdgeInsets.all(kDetailPad), child: body);
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(kDetailPad),
      decoration: BoxDecoration(
        color: tint!.withValues(alpha: AppColors.isLight ? 0.07 : 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tint!.withValues(alpha: 0.30)),
      ),
      child: body,
    );
  }
}

enum ActionKind { primary, ghost, danger }

/// 44px balandlikdagi tugma — matn bir qatorda (sig'masa kiçrayadi), şuning uçun
/// yonma-yon tugmalar doim bir xil balandlikda.
class ActionBtn extends StatelessWidget {
  const ActionBtn({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.kind = ActionKind.primary,
    this.leadingWidget,
    this.height = kActionHeight,
  });

  /// null — ota widget belgilaydi (masalan IntrinsicHeight ičida maydon bilan teng).
  final double? height;

  final String label;
  final VoidCallback? onPressed;
  final TIData? icon;
  final ActionKind kind;

  /// Ikonka örniga ixtiyoriy widget (masalan yulduzça).
  final Widget? leadingWidget;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    final Color fg;
    final BoxDecoration deco;
    switch (kind) {
      case ActionKind.primary:
        fg = Colors.white;
        deco = BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
          ),
          borderRadius: BorderRadius.circular(12),
        );
      case ActionKind.ghost:
        fg = WebC.zinc200;
        deco = BoxDecoration(
          color: WebC.fill5,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: WebC.border),
        );
      case ActionKind.danger:
        fg = WebC.redSoft;
        deco = BoxDecoration(
          color: const Color(0xFFEF4444).withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: const Color(0xFFF87171).withValues(alpha: 0.30),
          ),
        );
    }
    return Opacity(
      opacity: disabled ? 0.45 : 1,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: deco,
          child: Center(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (leadingWidget != null) ...[
                    leadingWidget!,
                    const SizedBox(width: 8),
                  ] else if (icon != null) ...[
                    TIcon(icon, size: 17, color: fg),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    maxLines: 1,
                    style: TextStyle(
                      color: fg,
                      fontSize: 14,
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
  }
}

/// Tugmalar: 1–2 ta — yonma-yon teng kenglikda, köproq — ustma-ust.
class ActionGroup extends StatelessWidget {
  const ActionGroup({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();
    if (children.length <= 2) {
      return Row(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(child: children[i]),
          ],
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          children[i],
        ],
      ],
    );
  }
}

/// Asosiy faktlar plitkasi (byudjet, muddat...): kiçik yorliq + qiymat, bir qatorda.
class FactTile extends StatelessWidget {
  const FactTile({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.muted = false,
  });

  final TIData icon;
  final String label;
  final String value;

  /// Qiymat yöq (masalan «Kelişiladi») — xira rangda.
  final bool muted;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: WebC.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WebC.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: WebC.indigoFill,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(child: TIcon(icon, size: 18, color: WebC.indigo)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
                const SizedBox(height: 2),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    maxLines: 1,
                    style: TextStyle(
                      color: muted ? WebC.zinc400 : WebC.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// «Yorliq ...... qiymat» qatori (şartnoma tafsilotlari uçun).
class KeyValueRow extends StatelessWidget {
  const KeyValueRow({super.key, required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: WebC.zinc500, fontSize: 14)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                color: WebC.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Kiçik izoh qutisi (ikonka + matn) — ogohlantiriş va tuşuntirişlar uçun.
class InfoNote extends StatelessWidget {
  const InfoNote({
    super.key,
    required this.text,
    this.icon = TI.info_rounded,
    this.color,
    this.title,
  });

  final String text;
  final TIData icon;
  final Color? color;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final c = color ?? WebC.zinc400;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color == null
            ? AppColors.tint(0.04)
            : color!.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: TIcon(icon, size: 16, color: c),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null) ...[
                  Text(
                    title!,
                    style: TextStyle(
                      color: color ?? WebC.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                Text(
                  text,
                  style: TextStyle(
                    color: title == null ? WebC.zinc400 : WebC.zinc300,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
