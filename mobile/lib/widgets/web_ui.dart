import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Saytdagi Tailwind ranglari — `html.light` override'lari bilan birga.
/// Ilova ko'rinishi saytning mobil versiyasi bilan bir xil bo'lishi uchun
/// ranglar shu yerdan olinadi.
class WebC {
  WebC._();
  static bool get _l => AppColors.isLight;

  static Color get white => _l ? const Color(0xFF18181B) : Colors.white;
  static Color get zinc200 => _l ? const Color(0xFF27272A) : const Color(0xFFE4E4E7);
  static Color get zinc300 => _l ? const Color(0xFF27272A) : const Color(0xFFD4D4D8);
  static Color get zinc400 => _l ? const Color(0xFF52525B) : const Color(0xFFA1A1AA);
  static Color get zinc500 => _l ? const Color(0xFF52525B) : const Color(0xFF71717A);
  static Color get zinc600 => _l ? const Color(0xFF71717A) : const Color(0xFF52525B);
  static Color get emerald => _l ? const Color(0xFF047857) : const Color(0xFF34D399);
  static Color get red => _l ? const Color(0xFFDC2626) : const Color(0xFFF87171);
  static Color get redSoft => _l ? const Color(0xFFDC2626) : const Color(0xFFFCA5A5);
  static Color get amber => _l ? const Color(0xFFB45309) : const Color(0xFFFCD34D);
  static Color get indigo => _l ? const Color(0xFF4338CA) : const Color(0xFF818CF8);
  static Color get indigoSoft => _l ? const Color(0xFF4338CA) : const Color(0xFFA5B4FC);

  /// `bg-white/5`
  static Color get fill5 => _l ? Colors.black.withValues(alpha: 0.04) : Colors.white.withValues(alpha: 0.05);

  /// `bg-white/10`
  static Color get fill10 => _l ? Colors.black.withValues(alpha: 0.06) : Colors.white.withValues(alpha: 0.10);

  /// `border-white/10`
  static Color get border => _l ? Colors.black.withValues(alpha: 0.10) : Colors.white.withValues(alpha: 0.10);

  /// `bg-indigo-500/15..20`
  static Color get indigoFill => _l
      ? const Color(0xFF4F46E5).withValues(alpha: 0.16)
      : const Color(0xFF6366F1).withValues(alpha: 0.18);

  /// `.card` foni/chegarasi
  static Color get cardBg => _l ? Colors.white : Colors.white.withValues(alpha: 0.035);
  static Color get cardBorder => _l ? Colors.black.withValues(alpha: 0.08) : Colors.white.withValues(alpha: 0.08);

  /// Header / menyu paneli (`bg-[#0b0b12]/90`, `bg-[#0e0e16]/95`)
  static Color get panel => _l ? Colors.white.withValues(alpha: 0.88) : const Color(0xFF0E0E16).withValues(alpha: 0.95);
  static Color get headerBar => _l ? Colors.white.withValues(alpha: 0.88) : const Color(0xFF0B0B12).withValues(alpha: 0.90);
}

/// Saytdagi `.card`: 16px burchak, nozik chegara, 20px ichki bo'shliq.
class WebCard extends StatelessWidget {
  const WebCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.onTap,
    this.opacity = 1,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    Widget box = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: WebC.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WebC.cardBorder),
      ),
      child: child,
    );
    if (!AppColors.isLight) {
      box = ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14), child: box),
      );
    }
    if (opacity < 1) box = Opacity(opacity: opacity, child: box);
    if (onTap == null) return box;
    return GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: box);
  }
}

enum WebBtn { primary, ghost, white, danger }

/// Saytdagi `.btn-primary` / `.btn-ghost` / `.btn-white` tugmalari:
/// 12px burchak, `0.6rem 1.1rem` padding, 14px matn.
class WebButton extends StatelessWidget {
  const WebButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = WebBtn.primary,
    this.expand = false,
    this.icon,
    this.busy = false,
    this.small = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final WebBtn variant;
  final bool expand;
  final Widget? icon;
  final bool busy;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final disabled = onPressed == null || busy;
    Color fg;
    BoxDecoration deco;
    switch (variant) {
      case WebBtn.primary:
        fg = Colors.white;
        deco = BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF4F46E5).withValues(alpha: 0.45),
              blurRadius: 26,
              offset: const Offset(0, 10),
              spreadRadius: -14,
            ),
          ],
        );
      case WebBtn.ghost:
        fg = WebC.zinc300;
        deco = BoxDecoration(
          color: WebC.fill5,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: WebC.border),
        );
      case WebBtn.white:
        fg = light ? Colors.white : const Color(0xFF09090B);
        deco = BoxDecoration(
          color: light ? const Color(0xFF18181B) : const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(12),
        );
      case WebBtn.danger:
        fg = WebC.redSoft;
        deco = BoxDecoration(
          color: const Color(0xFFEF4444).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
        );
    }
    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (busy)
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          )
        else ...[
          if (icon != null) ...[icon!, const SizedBox(width: 8)],
          Flexible(
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: fg,
                fontSize: small ? 13 : 14,
                fontWeight: FontWeight.w500,
                height: 1.2,
              ),
            ),
          ),
        ],
      ],
    );
    return Opacity(
      opacity: disabled ? 0.45 : 1,
      child: GestureDetector(
        onTap: disabled ? null : onPressed,
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: small ? 14 : 17.6, vertical: small ? 8 : 9.6),
          decoration: deco,
          child: content,
        ),
      ),
    );
  }
}

/// Saytdagi `.label`: 12.8px, 500, zinc-400, pastda 5.6px.
class WebLabel extends StatelessWidget {
  const WebLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5.6),
      child: Text(text, style: TextStyle(color: WebC.zinc400, fontSize: 12.8, fontWeight: FontWeight.w500)),
    );
  }
}

/// Sahifa sarlavhasi (`h1`) va ixtiyoriy izohi.
class WebPageTitle extends StatelessWidget {
  const WebPageTitle(this.title, {super.key, this.subtitle, this.size = 22});
  final String title;
  final String? subtitle;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(color: WebC.white, fontSize: size, fontWeight: FontWeight.w600, letterSpacing: -0.3),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle!, style: TextStyle(color: WebC.zinc400, fontSize: 14, height: 1.45)),
        ],
      ],
    );
  }
}

/// Saytdagi "‹ orqaga" havolasi.
class WebBackLink extends StatelessWidget {
  const WebBackLink({super.key, this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap ?? () => Navigator.of(context).maybePop(),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Text('‹ orqaga', style: TextStyle(color: WebC.zinc500, fontSize: 14)),
      ),
    );
  }
}

/// Saytdagi yumaloq tanlov tugmachasi (saralash / status filtri).
class WebPill extends StatelessWidget {
  const WebPill({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
    this.bordered = false,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  /// `true` — filtr oynasidagi chegarali chip; `false` — saralash tugmachasi.
  final bool bordered;

  @override
  Widget build(BuildContext context) {
    if (bordered) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: active ? WebC.indigoFill : WebC.fill5,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: active ? const Color(0xFF818CF8) : WebC.border),
          ),
          child: Text(label, style: TextStyle(color: active ? WebC.white : WebC.zinc300, fontSize: 14)),
        ),
      );
    }
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? WebC.indigoFill : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(label, style: TextStyle(color: active ? WebC.white : WebC.zinc500, fontSize: 12)),
      ),
    );
  }
}

/// Saytdagi kichik nishon (`rounded-full border bg-white/5 px-2.5 py-1 text-xs`).
class WebBadge extends StatelessWidget {
  const WebBadge(this.text, {super.key, this.color});
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: WebC.fill5,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: WebC.border),
      ),
      child: Text(text, style: TextStyle(color: color ?? WebC.zinc400, fontSize: 12)),
    );
  }
}

/// Saytdagi `.input` ko'rinishidagi matn maydoni.
class WebInput extends StatelessWidget {
  const WebInput({
    super.key,
    this.controller,
    this.hint,
    this.onChanged,
    this.keyboardType,
    this.maxLines = 1,
    this.minLines,
    this.obscure = false,
    this.suffix,
    this.mono = false,
    this.readOnly = false,
    this.onTap,
  });

  final TextEditingController? controller;
  final String? hint;
  final ValueChanged<String>? onChanged;
  final TextInputType? keyboardType;
  final int maxLines;
  final int? minLines;
  final bool obscure;
  final Widget? suffix;
  final bool mono;
  final bool readOnly;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      keyboardType: keyboardType,
      maxLines: obscure ? 1 : maxLines,
      minLines: minLines,
      obscureText: obscure,
      readOnly: readOnly,
      onTap: onTap,
      style: TextStyle(
        color: AppColors.isLight ? const Color(0xFF1B1B1F) : const Color(0xFFE4E4E7),
        fontSize: 14,
        height: 1.5,
        fontFamily: mono ? 'monospace' : null,
      ),
      decoration: webInputDecoration(hint: hint, suffix: suffix),
    );
  }
}

InputDecoration webInputDecoration({String? hint, Widget? suffix}) {
  final light = AppColors.isLight;
  OutlineInputBorder b(Color c, [double w = 1]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(11.2),
        borderSide: BorderSide(color: c, width: w),
      );
  final normal = light ? Colors.black.withValues(alpha: 0.14) : Colors.white.withValues(alpha: 0.10);
  return InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: Color(0xFF71717A), fontSize: 14, height: 1.5),
    isDense: true,
    filled: true,
    fillColor: light ? Colors.white : Colors.white.withValues(alpha: 0.04),
    contentPadding: const EdgeInsets.symmetric(horizontal: 12.8, vertical: 9.6),
    suffixIcon: suffix,
    suffixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 20),
    border: b(normal),
    enabledBorder: b(normal),
    focusedBorder: b(const Color(0xFF6366F1)),
    disabledBorder: b(normal),
  );
}

/// Saytdagi `<Stars>`: ★ to'lgan (amber-400), ☆ bo'sh (zinc-600).
class WebStars extends StatelessWidget {
  const WebStars({super.key, required this.value, this.size = 12});
  final double value;
  final double size;

  @override
  Widget build(BuildContext context) {
    final rounded = (value * 2).round() / 2;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Padding(
            padding: const EdgeInsets.only(right: 2),
            child: Text(
              i <= rounded || i - 0.5 == rounded ? '★' : '☆',
              style: TextStyle(
                fontSize: size,
                height: 1.2,
                color: i <= rounded ? const Color(0xFFFBBF24) : WebC.zinc600,
              ),
            ),
          ),
      ],
    );
  }
}

/// Saytdagi `<StarInput>`: bosib tanlanadigan 5 ta katta yulduz.
class WebStarInput extends StatelessWidget {
  const WebStarInput({super.key, required this.value, required this.onChanged});
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 1; i <= 5; i++)
          GestureDetector(
            onTap: () => onChanged(i),
            child: Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Text(
                '★',
                style: TextStyle(fontSize: 30, height: 1.1, color: i <= value ? const Color(0xFFFBBF24) : WebC.zinc600),
              ),
            ),
          ),
      ],
    );
  }
}

/// Saytdagi modal oyna (`rounded-2xl bg-[#14141b] p-6`).
Future<T?> showWebDialog<T>(BuildContext context, {required WidgetBuilder builder}) {
  return showDialog<T>(
    context: context,
    barrierColor: AppColors.isLight ? const Color(0xFFE4E4E9).withValues(alpha: 0.66) : Colors.black.withValues(alpha: 0.75),
    builder: (ctx) => Dialog(
      backgroundColor: AppColors.isLight ? Colors.white : const Color(0xFF14141B),
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: WebC.border)),
      child: Padding(padding: const EdgeInsets.all(24), child: builder(ctx)),
    ),
  );
}
