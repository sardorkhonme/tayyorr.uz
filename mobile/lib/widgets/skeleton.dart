import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import 'glass_card.dart';

/// Saytdagi `.skel` klassi bilan bir xil effekt: xira fon ustida chapdan
/// o'ngga suzib o'tuvchi, o'ngga qiya ("/") yorug' chiziq, 1.7s, cheksiz;
/// qutichada fondan bilinib turadigan ingichka chegara.
class Skel extends StatefulWidget {
  const Skel({super.key, this.width, required this.height, this.borderRadius = 10, this.shape = BoxShape.rectangle});

  final double? width;
  final double height;
  final double borderRadius;
  final BoxShape shape;

  @override
  State<Skel> createState() => _SkelState();
}

class _SkelState extends State<Skel> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1700))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final radius = widget.shape == BoxShape.circle ? null : BorderRadius.circular(widget.borderRadius);
    final borderColor = AppColors.isLight ? Colors.black.withValues(alpha: 0.09) : Colors.white.withValues(alpha: 0.10);
    return Container(
      foregroundDecoration: BoxDecoration(
        shape: widget.shape,
        borderRadius: widget.shape == BoxShape.circle ? null : (radius ?? BorderRadius.circular(widget.height / 2)),
        border: Border.all(color: borderColor),
      ),
      child: ClipRRect(
      borderRadius: radius ?? BorderRadius.circular(widget.height / 2),
      child: SizedBox(
        width: widget.width,
        height: widget.height,
        child: DecoratedBox(
          decoration: BoxDecoration(color: AppColors.tint(0.06)),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return ClipRect(
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, _) {
                    final w = constraints.maxWidth.isFinite ? constraints.maxWidth : widget.width ?? 100;
                    final h = widget.height;
                    // qiya nur to'liq o'tishi uchun biroz kengroq yo'l
                    final dx = -w - h + _controller.value * (2 * w + 2 * h);
                    // Saytdagidek: qorong'ida oq, yorug'da indigo suzuvchi chiziq.
                    final sweepColor = AppColors.isLight
                        ? AppColors.indigo.withValues(alpha: 0.2)
                        : Colors.white.withValues(alpha: 0.16);
                    return Transform.translate(
                      offset: Offset(dx, 0),
                      child: OverflowBox(
                        maxWidth: double.infinity,
                        alignment: Alignment.centerLeft,
                        child: SizedBox(
                          width: w,
                          height: h,
                          child: CustomPaint(painter: _SlantedSweep(color: sweepColor)),
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ),
    ),
    );
  }
}

/// O'ngga qiya ("/") yorug' nur — pastki-chapdan yuqori-o'ngga yo'nalgan tasma.
class _SlantedSweep extends CustomPainter {
  _SlantedSweep({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const band = 40.0; // nur kengligi
    const angle = 0.42; // ~24° — yuqori uchi o'ngga og'gan
    final len = size.height * 3 + 40; // aylantirilganda ham balandlikni to'liq qoplasin
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.rotate(angle);
    final rect = Rect.fromLTWH(-band / 2, -len / 2, band, len);
    final paint = Paint()
      ..shader = LinearGradient(
        colors: [color.withValues(alpha: 0), color, color.withValues(alpha: 0)],
      ).createShader(rect);
    canvas.drawRect(rect, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _SlantedSweep old) => old.color != color;
}

/// Bir qatorli matn o'rnini bosuvchi chiziq.
class SBar extends StatelessWidget {
  const SBar({super.key, this.width, this.height = 14, this.borderRadius = 6});
  final double? width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Skel(width: width, height: height, borderRadius: borderRadius);
  }
}

/// Doira (avatar) o'rnini bosuvchi.
class SCircle extends StatelessWidget {
  const SCircle({super.key, this.size = 40});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Skel(width: size, height: size, shape: BoxShape.circle);
  }
}

/// Karta shaklidagi bo'sh blok (haqiqiy GlassCard o'rnini bosadi).
class SBlock extends StatelessWidget {
  const SBlock({super.key, required this.height, this.width});
  final double height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return Skel(width: width ?? double.infinity, height: height, borderRadius: 18);
  }
}

/// Ro'yxat qatori: doira (avatar) + ikki qator matn + o'ngda kichik belgi.
class SRow extends StatelessWidget {
  const SRow({super.key, this.withAvatar = true});
  final bool withAvatar;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      blur: false,
      child: Row(
        children: [
          if (withAvatar) ...[const SCircle(size: 40), const SizedBox(width: 12)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SBar(width: MediaQuery.of(context).size.width * 0.4, height: 14),
                const SizedBox(height: 6),
                SBar(width: MediaQuery.of(context).size.width * 0.25, height: 11),
              ],
            ),
          ),
          const SizedBox(width: 10),
          const SBar(width: 40, height: 13),
        ],
      ),
    );
  }
}

/// Karta qatori: sarlavha + tavsif + pastda kichik metama'lumot qatori.
class SCard extends StatelessWidget {
  const SCard({super.key});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      blur: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: SBar(width: MediaQuery.of(context).size.width * 0.4, height: 15)),
              const SizedBox(width: 10),
              const SBar(width: 56, height: 18, borderRadius: 99),
            ],
          ),
          const SizedBox(height: 10),
          const SBar(height: 11),
          const SizedBox(height: 6),
          SBar(width: MediaQuery.of(context).size.width * 0.5, height: 11),
          const SizedBox(height: 8),
          const SBar(width: 90, height: 10),
        ],
      ),
    );
  }
}

/// Forma maydoni: yorliq + input.
class SField extends StatelessWidget {
  const SField({super.key, this.width});
  final double? width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SBar(width: 70, height: 11),
          const SizedBox(height: 6),
          SBar(height: 46, width: width ?? double.infinity, borderRadius: 12),
        ],
      ),
    );
  }
}

/// Chat pufakchasi.
class SBubble extends StatelessWidget {
  const SBubble({super.key, required this.widthFraction, this.mine = false});
  final double widthFraction;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: SBar(
        width: MediaQuery.of(context).size.width * widthFraction,
        height: 38,
        borderRadius: 16,
      ),
    );
  }
}

/// Umumiy o'ram — bo'limlar orasidagi joylashuv (gap) uchun.
class SWrap extends StatelessWidget {
  const SWrap({super.key, required this.children, this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 32)});
  final List<Widget> children;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: padding,
      itemCount: children.length,
      separatorBuilder: (_, __) => const SizedBox(height: 14),
      itemBuilder: (context, i) => children[i],
    );
  }
}
