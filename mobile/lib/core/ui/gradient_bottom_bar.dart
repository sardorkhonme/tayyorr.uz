import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import 'liquid_glass.dart';
import 'ticons.dart';

class BottomBarItem {
  const BottomBarItem({required this.icon, required this.activeIcon, required this.label, this.badge = 0, this.avatar});
  final TIData icon;
  final TIData activeIcon;
  final String label;

  /// O'qilmaganlar soni va h.k. (0 — ko'rinmaydi)
  final int badge;

  /// Ikonka o'rniga (masalan Profil — foydalanuvchi rasmi): (o'lcham, tanlanganmi) → vidjet
  final Widget Function(double size, bool selected)? avatar;
}

/// Pastki panel — iOS 26 uslubidagi suzib turuvchi «suyuq shisha» (orqasidagi kontent xira ko'rinadi).
/// Tanlangan bo'lim — shisha tabletka (ikonka + to'liq nom). Bo'lim almashganda tabletka rezinadek
/// oqib o'tadi: oldingi qirrasi tez yetib boradi, orqadagisi kechikadi (yo'lda cho'ziladi va vertikal
/// ozgina siqiladi), so'ng prujinadek biroz o'tib ketib joyiga tushadi. Barmoqni panel bo'ylab surib
/// ham bo'lim tanlash mumkin. Tabletka panel chetidan hamma tomondan bir xil masofada turadi.
class GradientBottomBar extends StatefulWidget {
  const GradientBottomBar({super.key, required this.items, required this.index, required this.onTap});
  final List<BottomBarItem> items;
  final int index;
  final ValueChanged<int> onTap;

  static const double height = 68;
  static const double inset = 7;

  @override
  State<GradientBottomBar> createState() => _GradientBottomBarState();
}

class _GradientBottomBarState extends State<GradientBottomBar> with TickerProviderStateMixin {
  late final RubberMotion _m = RubberMotion(this, widget.index.toDouble());
  bool _dragging = false;

  int get _n => widget.items.length;
  double get _selWeight => _n > 4 ? 30 : 26;

  @override
  void didUpdateWidget(covariant GradientBottomBar old) {
    super.didUpdateWidget(old);
    if (widget.items.length != old.items.length) {
      _m.jumpTo(widget.index.clamp(0, _n - 1).toDouble());
    } else if (!_dragging && widget.index.toDouble() != _m.target) {
      _m.moveTo(widget.index.toDouble());
    }
  }

  @override
  void dispose() {
    _m.dispose();
    super.dispose();
  }

  /// Har bo'lim kengligi: tabletka markaziga (p) yaqin bo'lim kengayadi (nomi ko'rinadi) — silliq.
  List<double> _widths(double total, double p) {
    final w = [for (var i = 0; i < _n; i++) 10 + (_selWeight - 10) * (1 - (p - i).abs()).clamp(0.0, 1.0)];
    final sum = w.fold<double>(0, (a, b) => a + b);
    return [for (final x in w) x / sum * total];
  }

  /// Indeks birligidagi qirra (masalan 2.0 — 3-bo'limning chap qirrasi) → piksel.
  double _edge(double x, List<double> w) {
    if (x <= 0) return x * w.first;
    var acc = 0.0;
    for (var i = 0; i < w.length; i++) {
      if (x < i + 1) return acc + (x - i) * w[i];
      acc += w[i];
    }
    return acc + (x - w.length) * w.last;
  }

  /// Barmoq turgan joy → tabletka chap qirrasi (indeks birligida, markazi barmoq ostida).
  double _indexAt(double dx, List<double> w) {
    var acc = 0.0;
    for (var i = 0; i < w.length; i++) {
      if (dx < acc + w[i] || i == w.length - 1) return (i + (dx - acc) / w[i] - 0.5).clamp(0.0, _n - 1.0);
      acc += w[i];
    }
    return widget.index.toDouble();
  }

  void _endDrag() {
    _dragging = false;
    final i = _m.center.round().clamp(0, _n - 1);
    _m.moveTo(i.toDouble());
    if (i != widget.index) widget.onTap(i);
    // bo'lim almashmasa (masalan alohida sahifa ochilsa) — tabletka joriy bo'limga qaytadi
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_dragging && _m.target != widget.index.toDouble()) _m.moveTo(widget.index.toDouble());
    });
  }

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final bottom = MediaQuery.paddingOf(context).bottom;
    const inset = GradientBottomBar.inset;
    return Padding(
      padding: EdgeInsets.fromLTRB(12, 0, 12, bottom > 0 ? bottom + 2 : 12),
      child: LiquidGlass(
        borderRadius: BorderRadius.circular(28),
        blur: 28,
        height: GradientBottomBar.height,
        padding: const EdgeInsets.all(inset),
        child: LayoutBuilder(
          builder: (context, c) {
            final h = c.maxHeight;
            return GestureDetector(
              behavior: HitTestBehavior.opaque,
              onHorizontalDragStart: (d) {
                _dragging = true;
                _m.moveTo(_indexAt(d.localPosition.dx, _widths(c.maxWidth, _m.center)), drag: true);
              },
              onHorizontalDragUpdate: (d) => _m.moveTo(_indexAt(d.localPosition.dx, _widths(c.maxWidth, _m.center)), drag: true),
              onHorizontalDragEnd: (_) => _endDrag(),
              onHorizontalDragCancel: () => _dragging ? _endDrag() : null,
              child: AnimatedBuilder(
                animation: _m.listenable,
                builder: (context, _) {
                  final p = _m.center.clamp(0.0, _n - 1.0);
                  final w = _widths(c.maxWidth, p);
                  final l = _edge(_m.left.value, w).clamp(-inset + 1, c.maxWidth + inset - 1);
                  final r = _edge(_m.right.value, w).clamp(-inset + 1, c.maxWidth + inset - 1);
                  final ph = h * _m.verticalScale;
                  final pill = Rect.fromLTRB(math.min(l, r - 24), (h - ph) / 2, r, (h + ph) / 2);
                  var x = 0.0;
                  final children = <Widget>[];
                  for (var i = 0; i < _n; i++) {
                    final t = (1 - (p - i).abs()).clamp(0.0, 1.0);
                    children.add(
                      Positioned(
                        left: x,
                        width: w[i],
                        top: 0,
                        bottom: 0,
                        child: _Item(item: widget.items[i], t: t, onTap: () => widget.onTap(i)),
                      ),
                    );
                    x += w[i];
                  }
                  return CustomPaint(
                    painter: GlassPillPainter(rect: pill, radius: 21, light: light),
                    child: Stack(clipBehavior: Clip.none, children: children),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({required this.item, required this.t, required this.onTap});
  final BottomBarItem item;

  /// 0 — tanlanmagan, 1 — to'liq tanlangan (oraliq — tabletka o'tib ketayotganda)
  final double t;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final idle = light ? const Color(0xFF6B6B7B) : const Color(0xFFB4B4C3);
    final active = light ? const Color(0xFF4F3FD8) : Colors.white;
    final color = Color.lerp(idle, active, t)!;
    final selected = t > 0.5;
    final icon = item.avatar != null ? item.avatar!(26, selected) : TIcon(selected ? item.activeIcon : item.icon, size: 22, color: color);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              icon,
              if (item.badge > 0)
                Positioned(
                  right: -9,
                  top: -6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    constraints: const BoxConstraints(minWidth: 18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF43F5E),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: light ? Colors.white : const Color(0xFF2A2A3C), width: 2),
                    ),
                    child: Text(
                      item.badge > 99 ? '99+' : '${item.badge}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
            ],
          ),
          if (t > 0.02)
            Flexible(
              child: ClipRect(
                child: Align(
                  alignment: Alignment.centerLeft,
                  widthFactor: Curves.easeOut.transform(t),
                  child: Opacity(
                    opacity: Curves.easeIn.transform(t),
                    child: Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: Text(
                        item.label,
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.fade,
                        style: TextStyle(color: color, fontSize: 13.5, fontWeight: FontWeight.w700, letterSpacing: -0.1),
                      ),
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

/// Profil bo'limi uchun — foydalanuvchi rasmi (bo'lmasa bosh harfi gradient doirada).
Widget profileAvatar(String? image, String name, double size, bool selected) {
  final initial = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();
  return Container(
    width: size,
    height: size,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: (image ?? '').isEmpty ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]) : null,
    ),
    // chegara rasm ustida — rasm doirani to'liq qoplaydi (burchaklari ko'rinmaydi)
    foregroundDecoration: BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(color: selected ? Colors.white : Colors.white.withValues(alpha: 0.25), width: selected ? 2 : 1.2),
    ),
    child: (image ?? '').isEmpty
        ? Center(
            child: Text(
              initial,
              style: TextStyle(color: Colors.white, fontSize: size * 0.45, fontWeight: FontWeight.w800),
            ),
          )
        : ClipOval(
            child: SizedBox.expand(
              child: Image.network(image!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()),
            ),
          ),
  );
}
