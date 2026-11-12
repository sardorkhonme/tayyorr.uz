import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';

import '../theme/app_colors.dart';
import 'ticons.dart';

/// iOS 26 uslubidagi «suyuq shisha» (liquid glass) — header, pastki panel va tanlov tabletkalari uchun.
///
/// Tuzilishi: yumshoq soya → ClipRRect → bitta BackdropFilter (blur) → yarim shaffof, rejimga mos
/// tusli sirt + ichki yorug'lik (yuqoridan) + yupqa «spekulyar» chegara (chap-yuqoridan oq, pastga
/// qarab so'nadi). Ostidagi kontent xira bo'lib ko'rinib turadi.
class LiquidGlass extends StatelessWidget {
  const LiquidGlass({
    super.key,
    required this.child,
    this.borderRadius = const BorderRadius.all(Radius.circular(22)),
    this.blur = 26,
    this.padding,
    this.height,
    this.shadow = true,
    this.strong = false,
  });

  final Widget child;
  final BorderRadius borderRadius;
  final double blur;
  final EdgeInsetsGeometry? padding;
  final double? height;

  /// Suzib turuvchi elementlar uchun pastga tushuvchi yumshoq soya.
  final bool shadow;

  /// Matn ko'p bo'lgan joylar (chat sarlavhasi) uchun — sirt biroz zichroq (o'qilishi uchun).
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    Widget glass = ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: CustomPaint(
          painter: _GlassFillPainter(light: light, radius: borderRadius, strong: strong),
          foregroundPainter: _GlassRimPainter(light: light, radius: borderRadius),
          child: Container(height: height, padding: padding, child: child),
        ),
      ),
    );
    if (shadow) {
      glass = DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: borderRadius,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: light ? 0.10 : 0.45),
              blurRadius: 30,
              offset: const Offset(0, 12),
              spreadRadius: -8,
            ),
            BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: light ? 0.06 : 0.12), blurRadius: 22, spreadRadius: -6),
          ],
        ),
        child: glass,
      );
    }
    return RepaintBoundary(child: glass);
  }
}

/// Shisha sirtining o'zi: tusli yarim shaffof to'ldirish + yuqoridan ichki yorug'lik.
class _GlassFillPainter extends CustomPainter {
  _GlassFillPainter({required this.light, required this.radius, required this.strong});
  final bool light;
  final BorderRadius radius;
  final bool strong;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final rr = radius.toRRect(rect);
    final k = strong ? 1.25 : 1.0;
    // asosiy tus
    canvas.drawRRect(
      rr,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: light
              ? [Colors.white.withValues(alpha: 0.62 * k), const Color(0xFFF4F4FA).withValues(alpha: 0.50 * k)]
              : [const Color(0xFF2A2A3C).withValues(alpha: 0.52 * k), const Color(0xFF14141F).withValues(alpha: 0.58 * k)],
        ).createShader(rect),
    );
    // ichki yorug'lik — yuqori qirradan pastga so'nadi (shisha qalinligi hissi)
    canvas.drawRRect(
      rr,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.center,
          colors: [
            Colors.white.withValues(alpha: light ? 0.55 : 0.10),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(rect),
    );
    // pastki ichki soya — yumshoq hajm
    canvas.drawRRect(
      rr,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.center,
          colors: [
            (light ? const Color(0xFF6366F1) : Colors.black).withValues(alpha: light ? 0.05 : 0.18),
            Colors.transparent,
          ],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(covariant _GlassFillPainter old) => old.light != light || old.radius != radius || old.strong != strong;
}

/// Spekulyar chegara: chap-yuqori burchakda yorqin oq, o'rtada so'nadi, pastki-o'ngda yana xira yaltiraydi.
class _GlassRimPainter extends CustomPainter {
  _GlassRimPainter({required this.light, required this.radius});
  final bool light;
  final BorderRadius radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    paintGlassRim(canvas, radius.toRRect(rect).deflate(0.5), light, rect);
  }

  @override
  bool shouldRepaint(covariant _GlassRimPainter old) => old.light != light || old.radius != radius;
}

void paintGlassRim(Canvas canvas, RRect rr, bool light, Rect rect, {double strength = 1}) {
  // tashqi nozik kontur — yorug' fonda shisha chegarasi ko'rinsin
  canvas.drawRRect(
    rr,
    Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = (light ? Colors.black.withValues(alpha: 0.07) : Colors.white.withValues(alpha: 0.06)),
  );
  canvas.drawRRect(
    rr,
    Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withValues(alpha: (light ? 0.95 : 0.50) * strength),
          Colors.white.withValues(alpha: (light ? 0.25 : 0.06) * strength),
          Colors.white.withValues(alpha: 0),
          Colors.white.withValues(alpha: (light ? 0.55 : 0.22) * strength),
        ],
        stops: const [0, 0.32, 0.6, 1],
      ).createShader(rect),
  );
}

// ───────────────────────── rezinadek harakat ─────────────────────────

/// Tanlov tabletkasining chap va o'ng qirralari — ikkita alohida prujina (indeks birligida).
/// Harakat yo'nalishidagi (oldingi) qirra qattiq prujinada tez yetib boradi, orqadagisi yumshoqroq
/// prujinada kechikadi → tabletka yo'lda cho'ziladi, so'ng ozgina o'tib ketib (overshoot) joyiga tushadi.
class RubberMotion {
  RubberMotion(TickerProvider vsync, double index)
    : left = AnimationController.unbounded(vsync: vsync, value: index),
      right = AnimationController.unbounded(vsync: vsync, value: index + 1),
      target = index;

  final AnimationController left;
  final AnimationController right;
  double target;

  Listenable get listenable => Listenable.merge([left, right]);

  static const _lead = SpringDescription(mass: 1, stiffness: 420, damping: 25);
  static const _lag = SpringDescription(mass: 1, stiffness: 190, damping: 19);
  static const _dragLead = SpringDescription(mass: 1, stiffness: 900, damping: 46);
  static const _dragLag = SpringDescription(mass: 1, stiffness: 420, damping: 34);

  void moveTo(double to, {bool drag = false}) {
    target = to;
    final goingRight = to + 0.5 > (left.value + right.value) / 2;
    final lead = drag ? _dragLead : _lead;
    final lag = drag ? _dragLag : _lag;
    left.animateWith(SpringSimulation(goingRight ? lag : lead, left.value, to, left.velocity));
    right.animateWith(SpringSimulation(goingRight ? lead : lag, right.value, to + 1, right.velocity));
  }

  void jumpTo(double to) {
    target = to;
    left.value = to;
    right.value = to + 1;
  }

  /// Tabletka markazi (indeks birligida, 0 — birinchi bo'lim).
  double get center => (left.value + right.value - 1) / 2;

  /// > 0 — cho'zilgan, < 0 — siqilgan (joyiga tushayotganda).
  double get stretch => right.value - left.value - 1;

  /// Cho'zilganda vertikal biroz siqiladi (va aksincha) — hajm saqlanayotgandek.
  double get verticalScale {
    final s = stretch;
    return s >= 0 ? 1 - 0.16 * math.min(s, 1.0) : 1 + 0.10 * math.min(-s, 0.6);
  }

  void dispose() {
    left.dispose();
    right.dispose();
  }
}

/// Shisha tabletka (tanlangan bo'lim belgisi). O'zining BackdropFilter'i yo'q — u panel shishasining
/// ichida chiziladi: yorqinroq shisha linza + aksent tus + spekulyar chegara + yumshoq soya.
class GlassPillPainter extends CustomPainter {
  GlassPillPainter({required this.rect, required this.radius, required this.light, this.repaint}) : super(repaint: repaint);
  final Rect rect;
  final double radius;
  final bool light;
  final Listenable? repaint;

  @override
  void paint(Canvas canvas, Size size) {
    if (rect.width <= 0 || rect.height <= 0) return;
    paintGlassPill(canvas, rect, radius, light);
  }

  @override
  bool shouldRepaint(covariant GlassPillPainter old) => old.rect != rect || old.radius != radius || old.light != light;
}

void paintGlassPill(Canvas canvas, Rect rect, double radius, bool light) {
  final r = math.min(radius, rect.height / 2);
  final rr = RRect.fromRectAndRadius(rect, Radius.circular(r));
  // soya
  canvas.drawRRect(
    rr.shift(const Offset(0, 3)),
    Paint()
      ..color = (light ? const Color(0xFF4338CA) : Colors.black).withValues(alpha: light ? 0.14 : 0.40)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7),
  );
  // linza tanasi
  canvas.drawRRect(
    rr,
    Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: light
            ? [Colors.white.withValues(alpha: 0.96), const Color(0xFFEDEBFF).withValues(alpha: 0.90)]
            : [Colors.white.withValues(alpha: 0.20), Colors.white.withValues(alpha: 0.09)],
      ).createShader(rect),
  );
  // aksent tus (brend binafsha → ko'k)
  canvas.drawRRect(
    rr,
    Paint()
      ..shader = LinearGradient(
        colors: [
          const Color(0xFF8B5CF6).withValues(alpha: light ? 0.14 : 0.26),
          const Color(0xFF3B82F6).withValues(alpha: light ? 0.10 : 0.20),
        ],
      ).createShader(rect),
  );
  // yuqori yaltiroq (linza ustidagi yorug'lik)
  final hi = Rect.fromLTWH(rect.left + 3, rect.top + 1.5, rect.width - 6, rect.height * 0.48);
  canvas.drawRRect(
    RRect.fromRectAndRadius(hi, Radius.circular(math.max(0, r - 2))),
    Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Colors.white.withValues(alpha: light ? 0.70 : 0.22),
          Colors.white.withValues(alpha: 0),
        ],
      ).createShader(hi),
  );
  paintGlassRim(canvas, rr.deflate(0.5), light, rect, strength: 1.1);
}

// ───────────────────────── segmentli tanlov ─────────────────────────

class LiquidSegment {
  const LiquidSegment({required this.label, this.icon});
  final String label;
  final TIData? icon;
}

/// Teng kenglikdagi segmentli tanlov (masalan Yorug' / Qorong'i): shisha tabletka tanlangan segment
/// ostida turadi va boshqasiga rezinadek oqib o'tadi; barmoq bilan surib ham tanlash mumkin.
class LiquidSegmented extends StatefulWidget {
  const LiquidSegmented({super.key, required this.segments, required this.index, required this.onChanged, this.height = 36, this.framed = true});

  final List<LiquidSegment> segments;
  final int index;
  final ValueChanged<int> onChanged;
  final double height;

  /// Ramka (yo'lak) bilan — false bo'lsa faqat tabletka va segmentlar (menyu ichida).
  final bool framed;

  @override
  State<LiquidSegmented> createState() => _LiquidSegmentedState();
}

class _LiquidSegmentedState extends State<LiquidSegmented> with TickerProviderStateMixin {
  late final RubberMotion _m = RubberMotion(this, widget.index.toDouble());
  bool _dragging = false;

  @override
  void didUpdateWidget(covariant LiquidSegmented old) {
    super.didUpdateWidget(old);
    if (widget.index != old.index && !_dragging) _m.moveTo(widget.index.toDouble());
  }

  @override
  void dispose() {
    _m.dispose();
    super.dispose();
  }

  double _indexAt(double x, double segW) => (x / segW - 0.5).clamp(0.0, widget.segments.length - 1.0);

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    const pad = 3.0;
    final n = widget.segments.length;
    final idle = light ? const Color(0xFF6B6B7B) : const Color(0xFFA1A1AA);
    final active = light ? const Color(0xFF4F3FD8) : Colors.white;
    return Container(
      height: widget.height,
      padding: const EdgeInsets.all(pad),
      decoration: widget.framed
          ? BoxDecoration(
              color: AppColors.tint(light ? 0.05 : 0.06),
              borderRadius: BorderRadius.circular(widget.height / 2),
              border: Border.all(color: AppColors.cardBorder),
            )
          : null,
      child: LayoutBuilder(
        builder: (context, c) {
          final segW = c.maxWidth / n;
          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapUp: (d) => widget.onChanged((d.localPosition.dx / segW).floor().clamp(0, n - 1)),
            onHorizontalDragStart: (d) {
              _dragging = true;
              _m.moveTo(_indexAt(d.localPosition.dx, segW), drag: true);
            },
            onHorizontalDragUpdate: (d) => _m.moveTo(_indexAt(d.localPosition.dx, segW), drag: true),
            onHorizontalDragEnd: (_) {
              _dragging = false;
              final i = _m.center.round().clamp(0, n - 1);
              _m.moveTo(i.toDouble());
              if (i != widget.index) widget.onChanged(i);
            },
            child: AnimatedBuilder(
              animation: _m.listenable,
              builder: (context, _) {
                final h = c.maxHeight;
                final l = (_m.left.value * segW).clamp(-4.0, c.maxWidth + 4);
                final r = (_m.right.value * segW).clamp(-4.0, c.maxWidth + 4);
                final ph = h * _m.verticalScale;
                final pill = Rect.fromLTRB(math.min(l, r - 12), (h - ph) / 2, r, (h + ph) / 2);
                return CustomPaint(
                  painter: GlassPillPainter(rect: pill, radius: h / 2, light: light),
                  child: Row(
                    children: [
                      for (var i = 0; i < n; i++)
                        Expanded(
                          child: Builder(
                            builder: (context) {
                              final t = (1 - (_m.center - i).abs()).clamp(0.0, 1.0);
                              final col = Color.lerp(idle, active, t)!;
                              final s = widget.segments[i];
                              return Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (s.icon != null) ...[TIcon(s.icon, size: 14, color: col), const SizedBox(width: 6)],
                                  Flexible(
                                    child: Text(
                                      s.label,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(color: col, fontSize: 12.5, fontWeight: t > 0.5 ? FontWeight.w700 : FontWeight.w500),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
