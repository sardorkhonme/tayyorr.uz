import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import '../theme/app_colors.dart';
import 'ticons.dart';

/// iOS 26 «Liquid Glass» — ilovaning barcha suzuvchi qatlamlari (header, pastki panel, oynalar, menyular,
/// suzuvchi tugmalar) shu fayldagi vidjetlar orqali chiziladi.
///
/// Chizish `liquid_glass_widgets` paketi orqali (u qurilmaga qarab yöl tanlaydi):
///  · Impeller (iOS, zamonaviy Android — Vulkan/GLES) — haqiqiy shisha: orqadagi kontent qirralarda linzadek
///    egilib-sinadi (refraction), yorug'lik qirrasi, frost (xira) qatlam — `GlassQuality.premium`;
///  · Skia / shader qöllab-quvvatlanmasa — yengil shader (blur + qirra yorug'ligi), u ham yuklanmasa —
///    oddiy BackdropFilter blur + tus. Hech qachon qora yoki böş chiqmaydi.
///  · Qurilma sekin bölsa sifat avtomatik pasayadi (main.dart → `adaptiveQuality`).

/// Rejimga mos shisha sozlamasi (iOS 26 asosida).
///  · [strong] — matn köp joylar (çat sarlavhasi, yozish paneli) uçun biroz zichroq;
///  · [panel] — oynalar, menyular, pastdan chiqadigan panellar: matn bemalol öqilishi uçun yanada zich.
LiquidGlassSettings glassSettings({bool strong = false, bool panel = false, bool shadow = true}) {
  final light = AppColors.isLight;
  final base = light ? LiquidGlassSettings.ios26Light : LiquidGlassSettings.ios26Dark;
  final Color tint;
  if (panel) {
    tint = light ? const Color(0xD9FCFCFF) : const Color(0xB8191924);
  } else if (strong) {
    tint = light ? const Color(0xBFFBFBFF) : const Color(0x8C17171F);
  } else {
    tint = light ? const Color(0x9EFBFBFF) : const Color(0x33202030);
  }
  return base.copyWith(
    glassColor: tint,
    shadow: shadow
        ? [
            BoxShadow(
              color: Colors.black.withValues(alpha: light ? 0.10 : 0.40),
              blurRadius: panel ? 40 : 24,
              offset: Offset(0, panel ? 16 : 8),
              spreadRadius: -8,
            ),
          ]
        : const <BoxShadow>[],
  );
}

LiquidShape _shape(BorderRadius r) => LiquidRoundedSuperellipse(borderRadius: r.topLeft.x);

/// Suyuq shisha sirt (header, çat sarlavhasi, oyna, menyu).
class LiquidGlass extends StatelessWidget {
  const LiquidGlass({
    super.key,
    required this.child,
    this.borderRadius = const BorderRadius.all(Radius.circular(22)),
    this.padding,
    this.height,
    this.width,
    this.shadow = true,
    this.strong = false,
    this.panel = false,
    this.clip = false,
  });

  final Widget child;

  /// Faqat burchak radiusi olinadi (shakl — iOS'dagi kabi superellips).
  final BorderRadius borderRadius;
  final EdgeInsetsGeometry? padding;
  final double? height;
  final double? width;

  /// Suzib turuvchi elementlar uchun pastga tushuvchi yumshoq soya.
  final bool shadow;

  /// Matn ko'p bo'lgan joylar (chat sarlavhasi) uchun — sirt biroz zichroq (o'qilishi uchun).
  final bool strong;

  /// Oyna / menyu / panel — eng zich (uzun matn, formalar).
  final bool panel;

  /// Tarkib shakl chegarasidan chiqmasin (varaqlanadigan ro'yxatlar).
  final bool clip;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: GlassContainer(
        useOwnLayer: true,
        quality: GlassQuality.premium,
        shape: _shape(borderRadius),
        settings: glassSettings(strong: strong, panel: panel, shadow: shadow),
        clipBehavior: clip ? Clip.antiAlias : Clip.none,
        width: width,
        height: height,
        padding: padding,
        child: child,
      ),
    );
  }
}

/// Bosiladigan shisha tugma (iOS 26 navigatsiya / asboblar tugmasi): bosilganda shisha ozgina
/// kattalashib yorishadi, barmoq surilsa rezinadek cho'ziladi, qo'yib yuborilganda prujinadek joyiga qaytadi.
class GlassTap extends StatelessWidget {
  const GlassTap({
    super.key,
    required this.child,
    required this.onTap,
    this.width,
    this.height = 44,
    this.radius,
    this.tint,
    this.strong = false,
    this.semanticLabel,
    this.haptic = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final bool haptic;
  final double? width;
  final double height;

  /// null — to'liq kapsula (doira / tabletka).
  final double? radius;

  /// Rangli (asosiy amal) tugma — masalan yuborish.
  final Color? tint;
  final bool strong;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final r = radius ?? height / 2;
    var s = glassSettings(strong: strong, shadow: true);
    if (tint != null) s = s.copyWith(glassColor: tint!.withValues(alpha: 0.88));
    return RepaintBoundary(
      child: GlassButton.custom(
        onTap: onTap == null
            ? () {}
            : () {
                if (haptic) HapticFeedback.selectionClick();
                onTap!();
              },
        enabled: onTap != null,
        width: width,
        height: height,
        useOwnLayer: true,
        quality: GlassQuality.premium,
        shape: width == height && r >= height / 2 ? const LiquidOval() : LiquidRoundedSuperellipse(borderRadius: r),
        settings: s,
        label: semanticLabel ?? '',
        child: child,
      ),
    );
  }
}

// ───────────────────────── segmentli tanlov ─────────────────────────

class LiquidSegment {
  const LiquidSegment({required this.label, this.icon});
  final String label;
  final TIData? icon;
}

/// Teng kenglikdagi segmentli tanlov (masalan Yorug' / Qorong'i) — iOS 26 segmented control:
/// tanlov shisha linza; bosib turilganda linza kattalashib ostidagini kattalashtirib ko'rsatadi,
/// surilganda cho'zilib oqadi, qo'yib yuborilganda joyiga «tomchidek» tushadi.
class LiquidSegmented extends StatelessWidget {
  const LiquidSegmented({super.key, required this.segments, required this.index, required this.onChanged, this.height = 36, this.framed = true});

  final List<LiquidSegment> segments;
  final int index;
  final ValueChanged<int> onChanged;
  final double height;

  /// Ramka (yo'lak) bilan — false bo'lsa yo'lak deyarli ko'rinmaydi (menyu ichida).
  final bool framed;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final idle = light ? const Color(0xFF52525B) : const Color(0xFFA1A1AA);
    final active = light ? const Color(0xFF4F46E5) : Colors.white;
    return SizedBox(
      height: height,
      child: GlassSegmentedControl(
        height: height,
        selectedIndex: index,
        onSegmentSelected: (i) {
          HapticFeedback.selectionClick();
          onChanged(i);
        },
        useOwnLayer: true,
        iconSize: 15,
        selectedIconColor: active,
        unselectedIconColor: idle,
        backgroundColor: framed ? AppColors.tint(light ? 0.06 : 0.08) : AppColors.tint(0.03),
        indicatorColor: light ? Colors.white.withValues(alpha: 0.92) : Colors.white.withValues(alpha: 0.16),
        selectedTextStyle: TextStyle(color: active, fontSize: 12.5, fontWeight: FontWeight.w700),
        unselectedTextStyle: TextStyle(color: idle, fontSize: 12.5, fontWeight: FontWeight.w500),
        labelPadding: const EdgeInsets.symmetric(horizontal: 8),
        segments: [
          for (final s in segments) GlassSegment(icon: s.icon == null ? null : TIcon(s.icon), label: s.label),
        ],
      ),
    );
  }
}

/// Pastdan chiqadigan panel (sheet) uchun — iOS 26 dagi kabi ekran chetlaridan ajralgan,
/// hamma burchagi yumaloq suzuvchi shisha.
class GlassSheetPanel extends StatelessWidget {
  const GlassSheetPanel({super.key, required this.child, this.padding});
  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
      child: LiquidGlass(panel: true, clip: true, borderRadius: BorderRadius.circular(34), padding: padding, child: child),
    );
  }
}
