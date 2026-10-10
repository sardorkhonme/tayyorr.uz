import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/storage/local_storage.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/app_logo.dart';
import '../../widgets/aurora_background.dart';
import '../../widgets/web_ui.dart';
import '../auth/presentation/login_screen.dart';

class _IntroPage {
  const _IntroPage(this.tag, this.title, this.body, this.art);
  final String tag;
  final String title;
  final String body;
  final Widget Function(double t) art;
}

final _pages = <_IntroPage>[
  _IntroPage(
    '1 · Buyurtma',
    'Ishingizni bir marta yozing',
    "Prezentatsiya, kurs ishi, referat, diplom — shartlarni qoldiring, barcha tayyorlovchilar ko'radi.",
    (t) => _OrderArt(t: t),
  ),
  _IntroPage(
    '2 · Tanlov',
    'Eng yaxshi taklifni tanlang',
    "Tayyorlovchilar narx va muddat taklif qiladi. Reyting va baholarga qarab o'zingizga mosini tanlaysiz.",
    (t) => _OffersArt(t: t),
  ),
  _IntroPage(
    '3 · Xavfsiz',
    "Pul ish tugagach o'tadi",
    "Mablag' shartnoma vaqtida hamyonda saqlanadi, ish topshirilgach tayyorlovchiga o'tadi. Hammasi chat orqali.",
    (t) => _SafeArt(t: t),
  ),
];

/// Ilovaga ilk kirganda (ro'yxatdan o'tmasdan) ko'rinadigan 3 ta tanishtiruv sahifasi.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> with SingleTickerProviderStateMixin {
  final _controller = PageController();
  late final AnimationController _float =
      AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat();
  double _page = 0;

  /// Qaysi sahifaga ketayotganimiz — animatsiya paytida tez bosilsa ham bosish yo'qolmasin.
  int _target = 0;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() => _page = _controller.page ?? 0));
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
        transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
      ),
    );
  }

  void _next() {
    if (_target >= _pages.length - 1) {
      _finish();
      return;
    }
    _target++;
    _controller.animateToPage(_target, duration: const Duration(milliseconds: 420), curve: Curves.easeOutCubic);
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
                    const AppLogo(height: 18),
                    const Spacer(),
                    AnimatedOpacity(
                      opacity: isLast ? 0 : 1,
                      duration: const Duration(milliseconds: 200),
                      child: TextButton(
                        onPressed: isLast ? null : _finish,
                        child: Text("O'tkazib yuborish", style: TextStyle(color: WebC.zinc400, fontSize: 14)),
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
                                child: Center(
                                  child: AnimatedBuilder(
                                    animation: _float,
                                    builder: (_, __) => p.art(_float.value),
                                  ),
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
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: WebC.indigoFill,
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                    child: Text(p.tag,
                                        style: TextStyle(
                                            color: WebC.indigoSoft, fontSize: 12, fontWeight: FontWeight.w600)),
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
                                    style: TextStyle(color: WebC.zinc400, fontSize: 15, height: 1.5),
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
                    Builder(builder: (_) {
                      final active = (1 - (i - _page).abs()).clamp(0.0, 1.0);
                      return Container(
                        width: 8 + 22 * active,
                        height: 8,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(99),
                          gradient: LinearGradient(colors: [
                            Color.lerp(WebC.fill10, const Color(0xFF6366F1), active)!,
                            Color.lerp(WebC.fill10, const Color(0xFFA78BFA), active)!,
                          ]),
                        ),
                      );
                    }),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
                child: SizedBox(
                  width: double.infinity,
                  child: WebButton(
                    label: isLast ? 'Boshlash' : 'Keyingisi',
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

// ── Illyustratsiyalar (sof Flutter, rasm faylsiz) ───────────────────

double _bob(double t, double phase, [double amp = 6]) => math.sin((t + phase) * 2 * math.pi) * amp;

class _Glass extends StatelessWidget {
  const _Glass({required this.child, this.width, this.padding = const EdgeInsets.all(14), this.radius = 18});
  final Widget child;
  final double? width;
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
          width: width,
          padding: padding,
          decoration: BoxDecoration(
            color: light ? Colors.white.withValues(alpha: 0.75) : Colors.white.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: light ? Colors.black.withValues(alpha: 0.08) : Colors.white.withValues(alpha: 0.14)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF4F46E5).withValues(alpha: 0.25),
                blurRadius: 30,
                offset: const Offset(0, 14),
                spreadRadius: -12,
              ),
            ],
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
          gradient: RadialGradient(colors: [color.withValues(alpha: 0.35), color.withValues(alpha: 0)]),
        ),
      );
}

Widget _bar(double w, {double h = 8, Color? c}) => Container(
      width: w,
      height: h,
      decoration: BoxDecoration(color: c ?? WebC.fill10, borderRadius: BorderRadius.circular(99)),
    );

class _OrderArt extends StatelessWidget {
  const _OrderArt({required this.t});
  final double t;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 300,
      height: 300,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const _Glow(size: 280),
          Transform.translate(
            offset: Offset(0, _bob(t, 0)),
            child: _Glass(
              width: 230,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(children: [
                    const Text('📝', style: TextStyle(fontSize: 18)),
                    const SizedBox(width: 8),
                    Text('Kurs ishi', style: TextStyle(color: WebC.white, fontWeight: FontWeight.w600, fontSize: 14)),
                  ]),
                  const SizedBox(height: 12),
                  _bar(180),
                  const SizedBox(height: 7),
                  _bar(140),
                  const SizedBox(height: 7),
                  _bar(160),
                  const SizedBox(height: 14),
                  Row(children: [
                    Text("150 000 so'm", style: TextStyle(color: WebC.emerald, fontWeight: FontWeight.w700, fontSize: 14)),
                    const Spacer(),
                    Text('3 kun', style: TextStyle(color: WebC.zinc400, fontSize: 12)),
                  ]),
                ],
              ),
            ),
          ),
          Positioned(
            right: 8,
            top: 36 + _bob(t, 0.3, 8),
            child: _Glass(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              radius: 99,
              child: Text('🎓 Diplom', style: TextStyle(color: WebC.zinc200, fontSize: 12)),
            ),
          ),
          Positioned(
            left: 0,
            bottom: 44 + _bob(t, 0.6, 8),
            child: _Glass(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              radius: 99,
              child: Text('📊 Prezentatsiya', style: TextStyle(color: WebC.zinc200, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}

class _OffersArt extends StatelessWidget {
  const _OffersArt({required this.t});
  final double t;

  Widget _offer(String initial, Color c, String price, double stars, {bool best = false}) {
    return _Glass(
      width: 240,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [c, c.withValues(alpha: 0.6)]),
            ),
            child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                WebStars(value: stars, size: 11),
                const SizedBox(height: 4),
                _bar(70, h: 6),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(price, style: TextStyle(color: WebC.white, fontWeight: FontWeight.w700, fontSize: 13)),
              if (best)
                Container(
                  margin: const EdgeInsets.only(top: 3),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text('tanlandi ✓', style: TextStyle(color: WebC.emerald, fontSize: 10)),
                ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 300,
      height: 300,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const _Glow(color: Color(0xFF8B5CF6), size: 280),
          Positioned(
            top: 40 + _bob(t, 0.1, 5),
            child: Opacity(opacity: 0.75, child: _offer('A', const Color(0xFFF59E0B), "140 000", 4)),
          ),
          Positioned(
            top: 112 + _bob(t, 0.4, 5),
            child: Transform.scale(
              scale: 1.06,
              child: _offer('S', const Color(0xFF6366F1), "120 000", 5, best: true),
            ),
          ),
          Positioned(
            top: 188 + _bob(t, 0.7, 5),
            child: Opacity(opacity: 0.75, child: _offer('D', const Color(0xFFEC4899), "160 000", 4.5)),
          ),
        ],
      ),
    );
  }
}

class _SafeArt extends StatelessWidget {
  const _SafeArt({required this.t});
  final double t;

  @override
  Widget build(BuildContext context) {
    final pulse = 0.5 + 0.5 * math.sin(t * 2 * math.pi);
    return SizedBox(
      width: 300,
      height: 300,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const _Glow(color: Color(0xFF10B981), size: 260),
          // qalqon
          Transform.translate(
            offset: Offset(0, _bob(t, 0, 5)),
            child: Container(
              width: 120 + 8 * pulse,
              height: 120 + 8 * pulse,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF6366F1), Color(0xFF10B981)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withValues(alpha: 0.35 + 0.2 * pulse),
                    blurRadius: 40,
                  ),
                ],
              ),
              child: const Icon(Icons.verified_user_rounded, color: Colors.white, size: 56),
            ),
          ),
          Positioned(
            left: 0,
            top: 40 + _bob(t, 0.25, 7),
            child: _Glass(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              child: Text("Ish tayyor ✅", style: TextStyle(color: WebC.zinc200, fontSize: 12)),
            ),
          ),
          Positioned(
            right: 0,
            bottom: 52 + _bob(t, 0.55, 7),
            child: _Glass(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              child: Text("+120 000 so'm", style: TextStyle(color: WebC.emerald, fontSize: 13, fontWeight: FontWeight.w700)),
            ),
          ),
          Positioned(
            left: 18,
            bottom: 20 + _bob(t, 0.8, 6),
            child: _Glass(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              child: Text('💬 Chat', style: TextStyle(color: WebC.zinc200, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
