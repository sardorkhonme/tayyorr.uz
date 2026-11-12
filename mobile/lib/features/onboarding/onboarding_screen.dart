import 'package:tayyorr_app/core/ui/ticons.dart';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/storage/local_storage.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/app_logo.dart';
import '../../widgets/aurora_background.dart';
import '../../widgets/mascot.dart';
import '../../widgets/web_ui.dart';
import '../auth/presentation/login_screen.dart';

class _IntroPage {
  const _IntroPage(
    this.tag,
    this.title,
    this.body,
    this.pose,
    this.glow,
    this.chips,
  );
  final String tag;
  final String title;
  final String body;

  /// Sahifa qahramoni — Tayyor-Man.
  final MascotPose pose;
  final Color glow;

  /// Maskot atrofida suzib yuruvçi kiçik yorliqlar.
  final List<_Chip> chips;
}

class _Chip {
  const _Chip(
    this.icon,
    this.label,
    this.align,
    this.phase, {
    this.accent = false,
  });
  final TIData icon;
  final String label;
  final Alignment align;
  final double phase;
  final bool accent;
}

final _pages = <_IntroPage>[
  _IntroPage(
    '1 · Buyurtma',
    'Işingizni bir marta yozing',
    "Prezentatsiya, kurs işi, referat, diplom — şartlarni qoldiring, barça tayyorlovçilar köradi.",
    MascotPose.onboard1,
    Color(0xFF6366F1),
    [
      _Chip(TI.school_rounded, 'Diplom', Alignment(0.95, -0.72), 0.3),
      _Chip(TI.bar_chart_rounded, 'Prezentatsiya', Alignment(-0.95, 0.62), 0.6),
    ],
  ),
  _IntroPage(
    '2 · Tanlov',
    'Eng yaxşi taklifni tanlang',
    "Tayyorlovçilar narx va muddat taklif qiladi. Reyting va baholarga qarab özingizga mosini tanlaysiz.",
    MascotPose.onboard2,
    Color(0xFF8B5CF6),
    [
      _Chip(TI.star_rounded, '5.0', Alignment(-0.95, -0.7), 0.2),
      _Chip(
        TI.check_rounded,
        '120 000 söm',
        Alignment(0.95, 0.66),
        0.55,
        accent: true,
      ),
    ],
  ),
  _IntroPage(
    '3 · Xavfsiz',
    "Pul iş tugagaç ötadi",
    "Mablağ şartnoma vaqtida hamyonda saqlanadi, iş topşirilgaç tayyorlovçiga ötadi. Hammasi çat orqali.",
    MascotPose.onboard3,
    Color(0xFF10B981),
    [
      _Chip(
        TI.check_circle_rounded,
        "Iş tayyor",
        Alignment(-0.95, -0.7),
        0.25,
        accent: true,
      ),
      _Chip(TI.chat_bubble_outline_rounded, 'Çat', Alignment(0.95, 0.66), 0.7),
    ],
  ),
];

/// Ilovaga ilk kirganda (ro'yxatdan o'tmasdan) ko'rinadigan 3 ta tanishtiruv sahifasi.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  final _controller = PageController();
  late final AnimationController _float = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 6),
  )..repeat();
  double _page = 0;

  /// Qaysi sahifaga ketayotganimiz — animatsiya paytida tez bosilsa ham bosish yo'qolmasin.
  int _target = 0;

  @override
  void initState() {
    super.initState();
    _controller.addListener(
      () => setState(() => _page = _controller.page ?? 0),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _float.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await LocalStorage.instance.setSeenOnboarding();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 450),
        pageBuilder: (_, __, ___) => const LoginScreen(),
        transitionsBuilder: (_, a, __, child) =>
            FadeTransition(opacity: a, child: child),
      ),
    );
  }

  void _next() {
    if (_target >= _pages.length - 1) {
      _finish();
      return;
    }
    _target++;
    _controller.animateToPage(
      _target,
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final index = _page.round();
    final isLast = index == _pages.length - 1;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 8, 0),
                child: Row(
                  children: [
                    const AppLogo(height: 20),
                    const Spacer(),
                    AnimatedOpacity(
                      opacity: isLast ? 0 : 1,
                      duration: const Duration(milliseconds: 200),
                      child: TextButton(
                        onPressed: isLast ? null : _finish,
                        child: Text(
                          "Ötkazib yuboriş",
                          style: TextStyle(color: WebC.zinc400, fontSize: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  // barmoq bilan surilganda ham maqsad sahifa yangilansin
                  onPageChanged: (i) => _target = i,
                  itemCount: _pages.length,
                  itemBuilder: (context, i) {
                    final p = _pages[i];
                    final delta = i - _page; // -1..1 — parallaks uchun
                    final fade = (1 - delta.abs()).clamp(0.0, 1.0);
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        children: [
                          Expanded(
                            child: Transform.translate(
                              offset: Offset(delta * 90, 0),
                              child: Opacity(
                                opacity: fade,
                                child: LayoutBuilder(
                                  builder: (context, c) {
                                    // kiçik ekranda ham sigsin: maydonning eng kiçik tomoni (eng köpi 320)
                                    final side = math.min(
                                      math.min(c.maxWidth, c.maxHeight),
                                      320.0,
                                    );
                                    return Center(
                                      child: _HeroArt(
                                        page: p,
                                        side: side,
                                        float: _float,
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),
                          Transform.translate(
                            offset: Offset(delta * 40, 0),
                            child: Opacity(
                              opacity: fade,
                              child: Column(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: WebC.indigoFill,
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                    child: Text(
                                      p.tag,
                                      style: TextStyle(
                                        color: WebC.indigoSoft,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  Text(
                                    p.title,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: WebC.white,
                                      fontSize: 26,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: -0.5,
                                      height: 1.2,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    p.body,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: WebC.zinc400,
                                      fontSize: 15,
                                      height: 1.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 28),
                        ],
                      ),
                    );
                  },
                ),
              ),
              // nuqtalar: joriy sahifa — cho'ziluvchi gradient tayoqcha
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _pages.length; i++)
                    Builder(
                      builder: (_) {
                        final active = (1 - (i - _page).abs()).clamp(0.0, 1.0);
                        return Container(
                          width: 8 + 22 * active,
                          height: 8,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(99),
                            gradient: LinearGradient(
                              colors: [
                                Color.lerp(
                                  WebC.fill10,
                                  const Color(0xFF6366F1),
                                  active,
                                )!,
                                Color.lerp(
                                  WebC.fill10,
                                  const Color(0xFFA78BFA),
                                  active,
                                )!,
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
                child: SizedBox(
                  width: double.infinity,
                  child: WebButton(
                    label: isLast ? 'Boşlaş' : 'Keyingisi',
                    expand: true,
                    onPressed: _next,
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

// ── Illyustratsiya: Tayyor-Man markazda, orqasida yumşoq nur, atrofida 2 ta yorliq ──

double _bob(double t, double phase, [double amp = 6]) =>
    math.sin((t + phase) * 2 * math.pi) * amp;

class _HeroArt extends StatelessWidget {
  const _HeroArt({required this.page, required this.side, required this.float});
  final _IntroPage page;
  final double side;
  final Animation<double> float;

  @override
  Widget build(BuildContext context) {
    // yorliqlar faqat yetarli joy bölsa
    final showChips = side >= 220;
    return SizedBox(
      width: side,
      height: side,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          _Glow(color: page.glow, size: side * 0.95),
          Mascot(page.pose, size: side * 0.86),
          if (showChips)
            for (final c in page.chips)
              Align(
                alignment: c.align,
                child: AnimatedBuilder(
                  animation: float,
                  builder: (_, child) => Transform.translate(
                    offset: Offset(0, _bob(float.value, c.phase, 7)),
                    child: child,
                  ),
                  child: _Glass(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    radius: 99,
                    child: IconLabel(
                      c.icon,
                      c.label,
                      color: c.accent ? WebC.emerald : null,
                      style: TextStyle(
                        color: c.accent ? WebC.emerald : WebC.zinc200,
                        fontSize: 12,
                        fontWeight: c.accent
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _Glass extends StatelessWidget {
  const _Glass({
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.radius = 18,
  });
  final Widget child;
  final EdgeInsets padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: light
                ? Colors.white.withValues(alpha: 0.85)
                : Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: light
                  ? Colors.black.withValues(alpha: 0.08)
                  : Colors.white.withValues(alpha: 0.14),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _Glow extends StatelessWidget {
  const _Glow({this.color = const Color(0xFF6366F1), this.size = 240});
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: RadialGradient(
        colors: [color.withValues(alpha: 0.30), color.withValues(alpha: 0)],
      ),
    ),
  );
}
