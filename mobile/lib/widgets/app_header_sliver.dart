import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../core/navigation/services.dart';
import '../core/theme/app_colors.dart';
import '../core/ui/liquid_glass.dart';
import '../features/home/section_cubit.dart';
import 'app_logo.dart';

/// Tepada suzib turuvchi shisha header — scroll'da doim ko'rinadi.
///  · tayyorr+ qobig'ining bo'limlarida — header yo'q (sahifaning o'z sarlavhasi yetarli);
///  · Tayyorr.uz / SMM qobig'ining (pastki paneldagi) bo'limlarida — chapda kichik tayyorr+ tugmasi
///    (bosh sahifaga qaytadi) va xizmat logosi, orqaga tugmasi yo'q;
///  · ichki (ochilgan) sahifalarda — orqaga tugmasi va xizmat logosi.
/// Profil — pastki panelda (headerda emas).
class AppHeaderSliver extends StatelessWidget {
  const AppHeaderSliver({super.key});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    // tema o'zgarganda soya ham darhol yangilansin (scroll kutmasdan)
    final light = Theme.of(context).brightness == Brightness.light;
    final root = ShellRootScope.of(context);
    if (root == ServiceKind.plus) {
      return SliverPersistentHeader(
        pinned: true,
        delegate: _FadeDelegate(top, light),
      );
    }
    return SliverPersistentHeader(
      pinned: true,
      delegate: _HeaderDelegate(top, light),
    );
  }
}

/// Header yo'q joylar uchun — faqat soat/batareya qatori ostidagi soya.
class _FadeDelegate extends SliverPersistentHeaderDelegate {
  _FadeDelegate(this.topInset, this.light);
  final double topInset;
  final bool light;

  @override
  double get minExtent => topInset + 8;
  @override
  double get maxExtent => topInset + 8;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) => _statusFade(topInset);

  @override
  bool shouldRebuild(covariant _FadeDelegate old) =>
      old.topInset != topInset || old.light != light;
}

/// Soat/batareya qatori ostidagi soya — sahifa fonidan shaffofga (kontent soat ostida ko'rinmaydi).
Widget _statusFade(double topInset) => IgnorePointer(
  child: DecoratedBox(
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          AppColors.bg,
          AppColors.bg.withValues(alpha: 0.85),
          AppColors.bg.withValues(alpha: 0),
        ],
        stops: const [0, 0.6, 1],
      ),
    ),
    child: SizedBox(height: topInset + 34, width: double.infinity),
  ),
);

class _HeaderDelegate extends SliverPersistentHeaderDelegate {
  _HeaderDelegate(this.topInset, this.light);
  final double topInset;
  final bool light;

  static const double barHeight = 56;
  double get _extent => topInset + 12 + barHeight + 4;

  @override
  double get minExtent => _extent;
  @override
  double get maxExtent => _extent;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    // soat/batareya qatori ostida — sahifa fonidan shaffofga o'tuvchi soya (kontent u yerda ko'rinmaydi)
    return Stack(
      children: [
        Positioned(
          left: 0,
          right: 0,
          top: 0,
          height: topInset + 34,
          child: _statusFade(topInset),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(12, topInset + 12, 12, 4),
          child: const WebHeaderBar(),
        ),
      ],
    );
  }

  @override
  bool shouldRebuild(covariant _HeaderDelegate old) =>
      old.topInset != topInset || old.light != light;
}

/// Headerning o'zi (sliver'siz) — iOS 26 navigatsiya qatori: alohida suzuvchi shisha kapsulalar
/// (orqaga tugmasi — doira, xizmat logosi — kapsula). Bosilganda shisha yorishib ozgina kattalashadi,
/// barmoq surilsa rezinadek cho'ziladi; orqadagi kontent qirralarda linzadek egilib ko'rinadi.
class WebHeaderBar extends StatelessWidget {
  const WebHeaderBar({super.key});

  @override
  Widget build(BuildContext context) {
    final service = ServiceScope.of(context);
    final atRoot = ShellRootScope.of(context) != null;
    const h = 48.0;
    Widget? lead;
    if (atRoot) {
      // xizmatning asosiy bo'limida — tayyorr+ (bosh sahifa) ga qaytish: orqaga belgisi + tayyorr+ logosi
      lead = GlassTap(
        height: h,
        onTap: openHub,
        semanticLabel: 'tayyorr+',
        child: Padding(
          padding: const EdgeInsets.only(left: 12, right: 14),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              TIcon(
                TI.arrow_back_ios_new_rounded,
                size: 17,
                color: AppColors.textPrimary,
              ),
              const SizedBox(width: 4),
              Image.asset(
                'assets/plus-mark.png',
                height: 24,
                filterQuality: FilterQuality.high,
              ),
            ],
          ),
        ),
      );
    } else if (ModalRoute.of(context)?.canPop ?? false) {
      lead = GlassTap(
        height: h,
        width: h,
        onTap: () => Navigator.of(context).maybePop(),
        semanticLabel: 'Orqaga',
        child: TIcon(
          TI.arrow_back_ios_new_rounded,
          size: 19,
          color: AppColors.textPrimary,
        ),
      );
    }
    return SizedBox(
      height: _HeaderDelegate.barHeight,
      child: Row(
        children: [
          if (lead != null) ...[lead, const SizedBox(width: 8)],
          Flexible(
            child: GlassTap(
              height: h,
              onTap: () => switch (service) {
                ServiceKind.uz => openUzSection(AppSection.dashboard),
                ServiceKind.smm => openSmm(0),
                ServiceKind.plus => openHub(),
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: switch (service) {
                  ServiceKind.uz => const AppLogo(height: 20),
                  ServiceKind.smm => const BrandLogo.smm(),
                  ServiceKind.plus => const BrandLogo.plus(),
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Bo'limga o'tish (Tayyorr.uz qobig'ida).
void goToSection(BuildContext context, AppSection section) =>
    openUzSection(section);

/// tayyorr+ va Tayyorr SMM logolari (belgi + yozuv).
class BrandLogo extends StatelessWidget {
  const BrandLogo.plus({super.key}) : smm = false;
  const BrandLogo.smm({super.key}) : smm = true;
  final bool smm;

  @override
  Widget build(BuildContext context) {
    final style = GoogleFonts.spaceGrotesk(
      fontSize: 19,
      height: 1.1,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.4,
      color: AppColors.textPrimary,
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          smm ? 'assets/smm-mark.png' : 'assets/plus-mark.png',
          height: 28,
          filterQuality: FilterQuality.high,
        ),
        const SizedBox(width: 7),
        Flexible(
          child: Text.rich(
            smm
                ? const TextSpan(
                    text: 'Tayyorr ',
                    children: [
                      TextSpan(
                        text: 'SMM',
                        style: TextStyle(color: Color(0xFFD946EF)),
                      ),
                    ],
                  )
                : const TextSpan(
                    text: 'tayyorr',
                    children: [
                      TextSpan(
                        text: '+',
                        style: TextStyle(color: Color(0xFFD946EF)),
                      ),
                    ],
                  ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: style,
          ),
        ),
      ],
    );
  }
}
