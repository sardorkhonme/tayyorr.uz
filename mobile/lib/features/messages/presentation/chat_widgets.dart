import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/liquid_glass.dart';
import '../../../widgets/web_ui.dart';

/// Telegramdagidek: o'tilgan xabar orqasida yumshoq indigo nur ikki marta
/// "lip-lip" yonib, so'nadi. [flashKey] o'zgarganda animatsiya qayta boshlanadi.
class FlashHighlight extends StatefulWidget {
  const FlashHighlight({super.key, required this.flashKey, required this.child});
  final int? flashKey;
  final Widget child;

  @override
  State<FlashHighlight> createState() => _FlashHighlightState();
}

class _FlashHighlightState extends State<FlashHighlight> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));
  late final Animation<double> _a = TweenSequence<double>([
    TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.0).chain(CurveTween(curve: Curves.easeOut)), weight: 14),
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.35), weight: 16),
    TweenSequenceItem(tween: Tween(begin: 0.35, end: 1.0), weight: 14),
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0).chain(CurveTween(curve: Curves.easeIn)), weight: 56),
  ]).animate(_c);

  @override
  void initState() {
    super.initState();
    if (widget.flashKey != null) _c.forward(from: 0);
  }

  @override
  void didUpdateWidget(covariant FlashHighlight old) {
    super.didUpdateWidget(old);
    if (widget.flashKey != null && widget.flashKey != old.flashKey) _c.forward(from: 0);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _a,
      child: widget.child,
      builder: (context, child) => DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xFF6366F1).withValues(alpha: 0.28 * _a.value),
          borderRadius: BorderRadius.circular(14),
        ),
        child: child,
      ),
    );
  }
}

/// Çat ro'yxati (teskari — 0 eng past) ustida o'ng pastdagi suzuvchi tugmalar:
///  · «pastga tushish» — foydalanuvchi bir ekrandan ko'proq yuqoriga chiqsa paydo bo'ladi;
///  · «@» — o'qilmagan belgilashlar bo'lsa, hisoblagich bilan: pastga tugmasi ko'rinsa — uning ustida,
///    ko'rinmasa — uning o'rnida.
class ChatScrollButtons extends StatefulWidget {
  const ChatScrollButtons({super.key, required this.controller, this.mentionCount = 0, this.onMention, this.onDown});
  final ScrollController controller;
  final int mentionCount;
  final VoidCallback? onMention;

  /// Bo'lmasa — ro'yxat boshiga (eng pastga) silliq aylanadi.
  final VoidCallback? onDown;

  @override
  State<ChatScrollButtons> createState() => _ChatScrollButtonsState();
}

class _ChatScrollButtonsState extends State<ChatScrollButtons> {
  bool _showDown = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onScroll);
  }

  @override
  void didUpdateWidget(covariant ChatScrollButtons old) {
    super.didUpdateWidget(old);
    if (old.controller != widget.controller) {
      old.controller.removeListener(_onScroll);
      widget.controller.addListener(_onScroll);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onScroll);
    super.dispose();
  }

  void _onScroll() {
    final c = widget.controller;
    if (!c.hasClients) return;
    final p = c.position;
    if (!p.hasContentDimensions) return;
    final show = p.pixels > p.viewportDimension * 0.9;
    if (show != _showDown) setState(() => _showDown = show);
  }

  void _down() {
    HapticFeedback.selectionClick();
    if (widget.onDown != null) return widget.onDown!();
    final c = widget.controller;
    if (!c.hasClients) return;
    final far = c.offset > c.position.viewportDimension * 4;
    // juda uzoqda bo'lsa — avval yaqiniga sakrab, keyin silliq
    if (far) c.jumpTo(c.position.viewportDimension * 1.5);
    c.animateTo(0, duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        _Pop(
          visible: widget.mentionCount > 0,
          child: Padding(
            padding: EdgeInsets.only(bottom: _showDown ? 10 : 0),
            child: _RoundFab(
              onTap: () {
                HapticFeedback.selectionClick();
                widget.onMention?.call();
              },
              count: widget.mentionCount,
              accent: true,
              child: const TIcon(TI.alternate_email_rounded, size: 20, color: Colors.white),
            ),
          ),
        ),
        _Pop(
          visible: _showDown,
          child: _RoundFab(
            onTap: _down,
            child: TIcon(TI.keyboard_arrow_down_rounded, size: 22, color: WebC.zinc300),
          ),
        ),
      ],
    );
  }
}

/// Paydo bo'lish/yo'qolish: kichrayib-so'nadi va joyini bo'shatadi.
class _Pop extends StatelessWidget {
  const _Pop({required this.visible, required this.child});
  final bool visible;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      alignment: Alignment.bottomCenter,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        switchInCurve: Curves.easeOutBack,
        transitionBuilder: (c, a) => ScaleTransition(scale: a, child: FadeTransition(opacity: a, child: c)),
        child: visible ? KeyedSubtree(key: const ValueKey(1), child: child) : const SizedBox(key: ValueKey(0), width: 46),
      ),
    );
  }
}

class _RoundFab extends StatelessWidget {
  const _RoundFab({required this.onTap, required this.child, this.count = 0, this.accent = false});
  final VoidCallback onTap;
  final Widget child;
  final int count;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    // iOS 26 suzuvchi shisha tugma: bosilganda yorishib kattalashadi, rezinadek cho'ziladi
    return Stack(clipBehavior: Clip.none, children: [
        GlassTap(
          width: 46,
          height: 46,
          haptic: false,
          onTap: onTap,
          tint: accent ? const Color(0xFF6D5CF6) : null,
          child: child,
        ),
        if (count > 0)
          Positioned(
            top: -4,
            right: -4,
            child: Container(
              constraints: const BoxConstraints(minWidth: 20),
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF43F5E),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: AppColors.isLight ? Colors.white : const Color(0xFF0B0B12), width: 2),
              ),
              child: Text(
                count > 99 ? '99+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800),
              ),
            ),
          ),
      ]);
  }
}

/// Telegramdagidek: xabarni chapga surib javob berish. Pufakcha chapga siljiydi, o'ngda «javob»
/// belgisi paydo bo'ladi; chegaradan o'tganda titraydi, qo'yib yuborilganda — [onReply].
/// O'ngga surilsa — ekrandan ortga qaytadi (chapda «ortga» belgisi chiqadi).
class SwipeToReply extends StatefulWidget {
  const SwipeToReply({super.key, required this.child, required this.onReply, this.enabled = true});
  final Widget child;
  final VoidCallback onReply;
  final bool enabled;

  @override
  State<SwipeToReply> createState() => _SwipeToReplyState();
}

class _SwipeToReplyState extends State<SwipeToReply> with SingleTickerProviderStateMixin {
  static const _threshold = 64.0;
  static const _max = 96.0;

  /// Qaytish — yengil «prujina» (biroz o'tib ketib, joyiga tushadi).
  late final AnimationController _back = AnimationController(vsync: this, duration: const Duration(milliseconds: 420));
  double _raw = 0; // barmoq haqiqatda qancha surdi
  double _dx = 0; // pufakcha qancha siljigan (qarshilik bilan)
  double _from = 0;
  bool _armed = false;
  bool _backArmed = false; // o'ngga yetarlicha surildi — qo'yib yuborilsa ortga qaytadi
  static const _backThreshold = 56.0;

  @override
  void initState() {
    super.initState();
    _back.addListener(() => setState(() => _dx = _from * (1 - Curves.easeOutBack.transform(_back.value))));
  }

  @override
  void dispose() {
    _back.dispose();
    super.dispose();
  }

  /// Rezina: qancha ko'p tortilsa, shuncha kam siljiydi.
  static double _rubber(double x, double limit) => limit * (1 - math.exp(-x / limit));

  void _update(DragUpdateDetails d) {
    if (_back.isAnimating) {
      _back.stop();
      _raw = _dx;
    }
    _raw += d.delta.dx;
    double next;
    if (_raw <= 0) {
      // chapga — javob: chegaragacha deyarli erkin, keyin qarshilik
      final x = -_raw;
      next = -(x <= _threshold ? x : _threshold + _rubber(x - _threshold, _max - _threshold));
    } else {
      // o'ngga — ortga qaytish: chegaragacha erkin, keyin qarshilik
      next = _raw <= _backThreshold ? _raw : _backThreshold + _rubber(_raw - _backThreshold, 40);
    }
    final armed = -next >= _threshold;
    final backArmed = next >= _backThreshold;
    if ((armed && !_armed) || (backArmed && !_backArmed)) HapticFeedback.lightImpact();
    setState(() {
      _dx = next;
      _armed = armed;
      _backArmed = backArmed;
    });
  }

  void _end([DragEndDetails? d]) {
    if (_armed) widget.onReply();
    final fling = (d?.primaryVelocity ?? 0) > 900 && _dx > 16;
    if (_backArmed || fling) Navigator.of(context).maybePop();
    _armed = false;
    _backArmed = false;
    _raw = 0;
    _from = _dx;
    _back.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) return widget.child;
    final p = (-_dx / _threshold).clamp(0.0, 1.0); // faqat chapga surganda belgi ko'rinadi
    final pb = (_dx / _backThreshold).clamp(0.0, 1.0); // o'ngga — «ortga» belgisi
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragStart: (_) => _raw = _dx,
      onHorizontalDragUpdate: _update,
      onHorizontalDragEnd: _end,
      onHorizontalDragCancel: _end,
      child: Stack(alignment: Alignment.centerRight, clipBehavior: Clip.none, children: [
        Positioned(
          right: 6,
          child: Opacity(
            opacity: p,
            child: Transform.scale(
              scale: 0.6 + 0.4 * p,
              child: Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _armed ? const Color(0xFF6366F1) : WebC.fill10,
                ),
                child: TIcon(TI.reply_rounded, size: 18, color: _armed ? Colors.white : WebC.zinc300),
              ),
            ),
          ),
        ),
        Positioned(
          left: 6,
          child: Opacity(
            opacity: pb,
            child: Transform.scale(
              scale: 0.6 + 0.4 * pb,
              child: Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _backArmed ? const Color(0xFF6366F1) : WebC.fill10,
                ),
                child: TIcon(TI.arrow_back_ios_new_rounded, size: 18, color: _backArmed ? Colors.white : WebC.zinc300),
              ),
            ),
          ),
        ),
        Transform.translate(offset: Offset(_dx, 0), child: widget.child),
      ]),
    );
  }
}

/// Yangi xabar paydo bo'lishi: pastdan biroz ko'tarilib, kattalashib chiqadi. Faqat bir marta
/// ([animate] true bo'lib qurilganda) — keyingi qayta qurilishlarda (server javobi bilan almashganda)
/// qayta o'ynamaydi.
class ChatAppear extends StatefulWidget {
  const ChatAppear({super.key, required this.animate, required this.child, this.fromRight = false});
  final bool animate;
  final bool fromRight;
  final Widget child;

  @override
  State<ChatAppear> createState() => _ChatAppearState();
}

class _ChatAppearState extends State<ChatAppear> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 260), value: widget.animate ? 0 : 1);
  late final Animation<double> _a = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);

  @override
  void initState() {
    super.initState();
    if (widget.animate) _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _a,
      child: widget.child,
      builder: (context, child) {
        if (_a.value >= 1) return child!;
        return Opacity(
          opacity: _a.value,
          child: Transform.translate(
            offset: Offset(0, 14 * (1 - _a.value)),
            child: Transform.scale(
              scale: 0.94 + 0.06 * _a.value,
              alignment: widget.fromRight ? Alignment.bottomRight : Alignment.bottomLeft,
              child: child,
            ),
          ),
        );
      },
    );
  }
}
