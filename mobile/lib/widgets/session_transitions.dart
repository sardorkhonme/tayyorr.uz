import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme/app_colors.dart';

const _magenta = Color(0xFFD946EF);

double _iv(double t, double a, double b, [Curve c = Curves.easeOutCubic]) =>
    c.transform(((t - a) / (b - a)).clamp(0.0, 1.0));

/// Ilova ochilganda — ~2.6 soniyalik kiriş animatsiyasi:
/// belgi aylanib kattalaşadi, orqasidan halqa to'lqini tarqaladi, «tayyorr+» harflari
/// birin-ketin sakrab çiqadi, ostidan şior, oxirida hammasi yumşoq kattalaşib ilovaga ötadi.
/// [onFinished] — animatsiya tugaganda (ilova tayyor bölsa — darhol keyingi ekran).
class IntroSplash extends StatefulWidget {
  const IntroSplash({super.key, this.onFinished, this.ready = false});

  final VoidCallback? onFinished;

  /// Sessiya aniqlandi — oxirgi «çiqiş» bosqiçi ijro etilsin.
  final bool ready;

  @override
  State<IntroSplash> createState() => _IntroSplashState();
}

class _IntroSplashState extends State<IntroSplash>
    with TickerProviderStateMixin {
  // asosiy sahna 2200ms, so'ng (sessiya tayyor bölsa) 400ms çiqiş
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2200),
  );
  late final AnimationController _out = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );
  late final AnimationController _wait = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void initState() {
    super.initState();
    _c.forward().whenComplete(_maybeExit);
  }

  @override
  void didUpdateWidget(covariant IntroSplash old) {
    super.didUpdateWidget(old);
    if (widget.ready && !old.ready) _maybeExit();
  }

  void _maybeExit() {
    if (!mounted || _c.value < 1) return;
    if (!widget.ready) {
      // sessiya hali aniqlanmagan — pastda yuklaniş çizig'i
      if (!_wait.isAnimating) _wait.repeat();
      setState(() {});
      return;
    }
    if (_out.isAnimating || _out.isCompleted) return;
    _out.forward().whenComplete(() {
      if (mounted) widget.onFinished?.call();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    _out.dispose();
    _wait.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: AnimatedBuilder(
        animation: Listenable.merge([_c, _out, _wait]),
        builder: (context, _) {
          final t = _c.value;
          final o = Curves.easeInCubic.transform(_out.value);
          final mark = _iv(t, 0.0, 0.34, Curves.easeOutBack);
          final markFade = _iv(t, 0.0, 0.18);
          final spin = (1 - _iv(t, 0.0, 0.38, Curves.easeOutCubic)) * -0.9;
          final ring1 = _iv(t, 0.12, 0.62);
          final ring2 = _iv(t, 0.26, 0.80);
          final tag = _iv(t, 0.62, 0.86);
          final sheen = _iv(t, 0.70, 1.0, Curves.easeInOutCubic);
          return Opacity(
            opacity: 1 - o,
            child: Transform.scale(
              scale: 1 + 0.12 * o,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 220,
                      height: 150,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          _Ring(progress: ring1, color: AppColors.indigo),
                          _Ring(progress: ring2, color: _magenta),
                          // yumşoq nur
                          Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.indigo.withValues(
                                    alpha: (light ? 0.18 : 0.35) * markFade,
                                  ),
                                  blurRadius: 60,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                          ),
                          Opacity(
                            opacity: markFade,
                            child: Transform.rotate(
                              angle: spin,
                              child: Transform.scale(
                                scale: 0.35 + 0.65 * mark,
                                child: Image.asset(
                                  'assets/plus-mark.png',
                                  height: 92,
                                  filterQuality: FilterQuality.high,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    _Wordmark(t: t, sheen: sheen),
                    const SizedBox(height: 12),
                    Opacity(
                      opacity: tag,
                      child: Transform.translate(
                        offset: Offset(0, 8 * (1 - tag)),
                        child: Text(
                          'Barça xizmatlar — bir joyda',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      height: 3,
                      child: _wait.isAnimating ? _Loader(t: _wait.value) : null,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// «tayyorr+» — har bir harf pastdan sakrab çiqadi, «+» oxirida aylanib tuşadi.
class _Wordmark extends StatelessWidget {
  const _Wordmark({required this.t, required this.sheen});
  final double t;
  final double sheen;

  @override
  Widget build(BuildContext context) {
    const word = 'tayyorr';
    final style = GoogleFonts.spaceGrotesk(
      fontSize: 38,
      height: 1.1,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.8,
      color: AppColors.textPrimary,
    );
    final letters = <Widget>[];
    for (var i = 0; i < word.length; i++) {
      final a = 0.30 + i * 0.04;
      final p = _iv(t, a, a + 0.20, Curves.easeOutBack);
      final f = _iv(t, a, a + 0.12);
      letters.add(
        Opacity(
          opacity: f,
          child: Transform.translate(
            offset: Offset(0, 22 * (1 - p)),
            child: Text(word[i], style: style),
          ),
        ),
      );
    }
    final plus = _iv(t, 0.62, 0.84, Curves.elasticOut);
    final plusFade = _iv(t, 0.62, 0.70);
    letters.add(
      Opacity(
        opacity: plusFade,
        child: Transform.rotate(
          angle: (1 - plus) * math.pi,
          child: Transform.scale(
            scale: 0.3 + 0.7 * plus,
            child: Text('+', style: style.copyWith(color: _magenta)),
          ),
        ),
      ),
    );
    final row = Row(mainAxisSize: MainAxisSize.min, children: letters);
    if (sheen <= 0 || sheen >= 1) return row;
    // oxirida yozuv ustidan yaltiroq nur ötadi
    return ShaderMask(
      blendMode: BlendMode.srcATop,
      shaderCallback: (rect) {
        final x = -1.4 + 2.8 * sheen;
        return LinearGradient(
          begin: Alignment(x - 0.5, 0),
          end: Alignment(x + 0.5, 0),
          colors: const [
            Colors.transparent,
            Color(0xCCA5B4FC),
            Colors.transparent,
          ],
          stops: const [0.3, 0.5, 0.7],
        ).createShader(rect);
      },
      child: row,
    );
  }
}

class _Ring extends StatelessWidget {
  const _Ring({required this.progress, required this.color});
  final double progress;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (progress <= 0 || progress >= 1) return const SizedBox.shrink();
    final size = 70 + 150 * progress;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: color.withValues(alpha: 0.5 * (1 - progress)),
          width: 2,
        ),
      ),
    );
  }
}

class _Loader extends StatelessWidget {
  const _Loader({required this.t});
  final double t;

  @override
  Widget build(BuildContext context) {
    const w = 110.0;
    const seg = 40.0;
    final left = -seg + (w + seg) * Curves.easeInOutCubic.transform(t);
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: Container(
        width: w,
        height: 3,
        color: AppColors.tint(0.08),
        child: Stack(
          children: [
            Positioned(
              left: left,
              top: 0,
              bottom: 0,
              width: seg,
              child: const DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.all(Radius.circular(99)),
                  gradient: LinearGradient(
                    colors: [
                      Color(0x006366F1),
                      Color(0xFF6366F1),
                      _magenta,
                      Color(0x00D946EF),
                    ],
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

/// Kirişdan keyin: «Assalomu alaykum, Ism!» va «Sizni körganimizdan xursandmiz» —
/// so'zlar birin-ketin paydo böladi, öqiş uçun yetarli vaqt (~2.8 s) turadi, so'ng ilovaga ötadi.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({
    super.key,
    required this.name,
    required this.onFinished,
  });

  final String name;
  final VoidCallback onFinished;

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3300),
  );

  @override
  void initState() {
    super.initState();
    _c.forward().whenComplete(() {
      if (mounted) widget.onFinished();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final greet = GoogleFonts.spaceGrotesk(
      fontSize: 30,
      height: 1.2,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.6,
      color: AppColors.textPrimary,
    );
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value;
          final out = _iv(t, 0.88, 1.0, Curves.easeInCubic);
          final hand = _iv(t, 0.0, 0.18, Curves.easeOutBack);
          final wave =
              math.sin(_iv(t, 0.08, 0.45, Curves.linear) * math.pi * 4) * 0.35;
          final l1 = _iv(t, 0.10, 0.30);
          final l2 = _iv(t, 0.22, 0.42);
          final l3 = _iv(t, 0.36, 0.56);
          final bar = _iv(t, 0.40, 0.88, Curves.linear);
          Widget line(double p, Widget child) => Opacity(
            opacity: p,
            child: Transform.translate(
              offset: Offset(0, 16 * (1 - p)),
              child: child,
            ),
          );
          return Opacity(
            opacity: 1 - out,
            child: Transform.translate(
              offset: Offset(0, -24 * out),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Transform.scale(
                        scale: hand,
                        child: Transform.rotate(
                          angle: wave,
                          alignment: Alignment.bottomRight,
                          child: const Text(
                            '👋',
                            style: TextStyle(fontSize: 64),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      line(
                        l1,
                        Text(
                          'Assalomu alaykum,',
                          textAlign: TextAlign.center,
                          style: greet,
                        ),
                      ),
                      const SizedBox(height: 2),
                      line(
                        l2,
                        ShaderMask(
                          blendMode: BlendMode.srcIn,
                          shaderCallback: (r) => const LinearGradient(
                            colors: [Color(0xFF818CF8), _magenta],
                          ).createShader(r),
                          child: Text(
                            '${widget.name}!',
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: greet.copyWith(fontSize: 34),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      line(
                        l3,
                        Text(
                          'Sizni körganimizdan xursandmiz',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 16,
                            height: 1.4,
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      Opacity(
                        opacity: l3,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: SizedBox(
                            width: 120,
                            height: 3,
                            child: Stack(
                              children: [
                                Positioned.fill(
                                  child: ColoredBox(
                                    color: AppColors.tint(0.08),
                                  ),
                                ),
                                FractionallySizedBox(
                                  widthFactor: bar,
                                  child: const DecoratedBox(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [Color(0xFF6366F1), _magenta],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Hisobdan çiqiş paytida: «Hisobdan çiqilmoqda» — eşik belgisi va nuqtalar animatsiyasi.
class SignOutScreen extends StatefulWidget {
  const SignOutScreen({super.key, this.name});
  final String? name;

  @override
  State<SignOutScreen> createState() => _SignOutScreenState();
}

class _SignOutScreenState extends State<SignOutScreen>
    with TickerProviderStateMixin {
  late final AnimationController _in = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 600),
  )..forward();
  late final AnimationController _loop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _in.dispose();
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: AnimatedBuilder(
        animation: Listenable.merge([_in, _loop]),
        builder: (context, _) {
          final a = Curves.easeOutBack.transform(_in.value.clamp(0.0, 1.0));
          final f = Curves.easeOut.transform(_in.value);
          final t = _loop.value;
          return Opacity(
            opacity: f,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Transform.scale(
                    scale: 0.6 + 0.4 * a,
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.indigo.withValues(alpha: 0.12),
                        border: Border.all(
                          color: AppColors.indigo.withValues(alpha: 0.25),
                        ),
                      ),
                      child: CustomPaint(
                        painter: _DoorPainter(t, AppColors.textPrimary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Hisobdan çiqilmoqda',
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(
                        width: 28,
                        child: Row(
                          children: [
                            for (var i = 0; i < 3; i++)
                              Opacity(
                                opacity:
                                    0.25 +
                                    0.75 *
                                        (0.5 +
                                                0.5 *
                                                    math.sin(
                                                      (t - i * 0.18) *
                                                          2 *
                                                          math.pi,
                                                    ))
                                            .clamp(0.0, 1.0),
                                child: Text(
                                  '.',
                                  style: GoogleFonts.spaceGrotesk(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.name == null
                        ? 'Yana kutib qolamiz!'
                        : 'Xayr, ${widget.name}! Yana kutib qolamiz',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14.5,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Eşik va undan çiqib ketayotgan strelka (tsikl).
class _DoorPainter extends CustomPainter {
  _DoorPainter(this.t, this.color);
  final double t;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    // eşik ramkasi (çapda)
    final door = Path()
      ..moveTo(c.dx + 2, c.dy - 20)
      ..lineTo(c.dx - 16, c.dy - 20)
      ..lineTo(c.dx - 16, c.dy + 20)
      ..lineTo(c.dx + 2, c.dy + 20);
    canvas.drawPath(door, p);
    // strelka — öngga surilib, xira tortadi
    final e = Curves.easeInOutCubic.transform(t);
    final dx = -4 + 14 * e;
    final alpha = t < 0.75 ? 1.0 : (1 - (t - 0.75) / 0.25);
    final ap = Paint()
      ..color = AppColors.indigo.withValues(alpha: alpha)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final y = c.dy;
    canvas.drawLine(Offset(c.dx - 6 + dx, y), Offset(c.dx + 14 + dx, y), ap);
    canvas.drawPath(
      Path()
        ..moveTo(c.dx + 7 + dx, y - 7)
        ..lineTo(c.dx + 14 + dx, y)
        ..lineTo(c.dx + 7 + dx, y + 7),
      ap,
    );
  }

  @override
  bool shouldRepaint(covariant _DoorPainter old) =>
      old.t != t || old.color != color;
}
