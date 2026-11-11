import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme/app_colors.dart';
import '../features/auth/bloc/auth_bloc.dart';
import '../core/navigation/services.dart';
import '../core/ui/app_dialogs.dart';
import '../features/home/section_cubit.dart';
import '../features/profile/presentation/profile_screen.dart';
import 'app_logo.dart';
import 'web_ui.dart';

/// Tepada suzib turuvchi shisha header — scroll'da doim ko'rinadi.
class AppHeaderSliver extends StatelessWidget {
  const AppHeaderSliver({super.key});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return SliverPersistentHeader(pinned: true, delegate: _HeaderDelegate(top));
  }
}

class _HeaderDelegate extends SliverPersistentHeaderDelegate {
  _HeaderDelegate(this.topInset);
  final double topInset;

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
          child: IgnorePointer(
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
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(12, topInset + 12, 12, 4),
          child: const WebHeaderBar(),
        ),
      ],
    );
  }

  @override
  bool shouldRebuild(covariant _HeaderDelegate old) => old.topInset != topInset;
}

/// Headerning o'zi (sliver'siz) — chapda orqaga tugmasi va xizmat logosi, o'ngda avatar.
/// Bo'limlar orasida pastki panel orqali o'tiladi (menyu yo'q).
class WebHeaderBar extends StatelessWidget {
  const WebHeaderBar({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;
    final image = user?.image ?? '';
    final service = ServiceScope.of(context);
    final canPop = ModalRoute.of(context)?.canPop ?? false;
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
        child: Container(
          height: _HeaderDelegate.barHeight,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: WebC.headerBar,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: AppColors.isLight
                  ? Colors.black.withValues(alpha: 0.08)
                  : Colors.white.withValues(alpha: 0.10),
            ),
          ),
          child: Row(
            children: [
              if (canPop) ...[
                GestureDetector(
                  onTap: () => Navigator.of(context).maybePop(),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: WebC.fill5,
                      border: Border.all(color: WebC.border),
                    ),
                    child: Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 16,
                      color: WebC.zinc300,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: GestureDetector(
                    onTap: () => switch (service) {
                      ServiceKind.uz => openUzSection(AppSection.dashboard),
                      ServiceKind.smm => openSmm(0),
                      ServiceKind.plus => openHub(),
                    },
                    child: switch (service) {
                      ServiceKind.uz => const AppLogo(height: 20),
                      ServiceKind.smm => const BrandLogo.smm(),
                      ServiceKind.plus => const BrandLogo.plus(),
                    },
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () => openProfile(context),
                child: Container(
                  width: 38,
                  height: 38,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: image.isEmpty ? kBrandGradient : null,
                    border: Border.all(
                      color: AppColors.isLight
                          ? Colors.black.withValues(alpha: 0.10)
                          : Colors.white.withValues(alpha: 0.15),
                    ),
                  ),
                  child: image.isEmpty
                      ? Center(
                          child: Text(
                            (user?.displayName ?? '?').trim().isEmpty
                                ? '?'
                                : (user?.displayName ?? '?')
                                      .trim()[0]
                                      .toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        )
                      : Image.network(
                          image,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox(),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bo'limga o'tish (Tayyorr.uz qobig'ida).
void goToSection(BuildContext context, AppSection section) =>
    openUzSection(section);

/// Profil: Tayyorr.uz qobig'ida — bo'lim; boshqa joyda — alohida sahifa.
void openProfile(BuildContext context) {
  if (ServiceScope.of(context) == ServiceKind.uz) {
    openUzSection(AppSection.profile);
  } else {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const StandaloneProfile()));
  }
}

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
                ? TextSpan(
                    text: 'Tayyorr ',
                    children: const [
                      TextSpan(
                        text: 'SMM',
                        style: TextStyle(color: Color(0xFFD946EF)),
                      ),
                    ],
                  )
                : TextSpan(
                    text: 'tayyorr',
                    children: const [
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
