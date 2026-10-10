import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import 'app_logo.dart';
import 'aurora_background.dart';

/// Ilova ochilayotganda ko'rinadigan brend animatsiyasi:
/// logo yumshoq paydo bo'ladi, orqasida indigo nur "nafas oladi",
/// logo ustidan yaltiroq nur o'tadi, pastda gradient yuklanish chizig'i.
class BrandSplash extends StatefulWidget {
  const BrandSplash({super.key});

  @override
  State<BrandSplash> createState() => _BrandSplashState();
}

class _BrandSplashState extends State<BrandSplash> with TickerProviderStateMixin {
  late final AnimationController _intro =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..forward();
  late final AnimationController _loop =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat();

  @override
  void dispose() {
    _intro.dispose();
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appear = CurvedAnimation(parent: _intro, curve: Curves.easeOutCubic);
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: AuroraBackground(
        child: Center(
          child: AnimatedBuilder(
            animation: Listenable.merge([_intro, _loop]),
            builder: (context, _) {
              final t = _loop.value;
              final breathe = 0.5 + 0.5 * math.sin(t * 2 * math.pi);
              return Opacity(
                opacity: appear.value,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 260,
                      height: 120,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // nafas oluvchi nur
                          Container(
                            width: 200 + 40 * breathe,
                            height: 90 + 20 * breathe,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(999),
                              gradient: RadialGradient(
                                colors: [
                                  const Color(0xFF6366F1).withValues(alpha: 0.30 + 0.15 * breathe),
                                  const Color(0xFF8B5CF6).withValues(alpha: 0.10),
                                  Colors.transparent,
                                ],
                                stops: const [0, 0.5, 1],
                              ),
                            ),
                          ),
                          Transform.scale(
                            scale: 0.9 + 0.1 * appear.value,
                            child: ShaderMask(
                              blendMode: BlendMode.srcATop,
                              shaderCallback: (rect) {
                                // logo ustidan chapdan o'ngga o'tuvchi yaltiroq nur
                                final x = -1.0 + 3.0 * t;
                                return LinearGradient(
                                  begin: Alignment(x - 0.6, -0.3),
                                  end: Alignment(x + 0.6, 0.3),
                                  colors: [
                                    Colors.transparent,
                                    Colors.white.withValues(alpha: AppColors.isLight ? 0.0 : 0.85),
                                    const Color(0xFFA5B4FC).withValues(alpha: 0.9),
                                    Colors.transparent,
                                  ],
                                  stops: const [0.35, 0.48, 0.52, 0.65],
                                ).createShader(rect);
                              },
                              child: const AppLogo(height: 34),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    _LoaderLine(t: t),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Ingichka trek ustida sirpanuvchi indigo→binafsha gradient bo'lak.
class _LoaderLine extends StatelessWidget {
  const _LoaderLine({required this.t});
  final double t;

  @override
  Widget build(BuildContext context) {
    const w = 120.0;
    const seg = 44.0;
    final eased = Curves.easeInOutCubic.transform(t);
    final left = -seg + (w + seg) * eased;
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: Container(
        width: w,
        height: 3,
        color: AppColors.isLight ? Colors.black.withValues(alpha: 0.08) : Colors.white.withValues(alpha: 0.08),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: left,
              top: 0,
              bottom: 0,
              width: seg,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(99),
                  gradient: const LinearGradient(
                    colors: [Color(0x006366F1), Color(0xFF6366F1), Color(0xFFA78BFA), Color(0x00A78BFA)],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
