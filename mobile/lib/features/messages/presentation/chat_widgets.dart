import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/theme/app_colors.dart';
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
              child: const TIcon(TI.alternate_email_rounded, size: 22, color: Colors.white),
            ),
          ),
        ),
        _Pop(
          visible: _showDown,
          child: _RoundFab(
            onTap: _down,
            child: TIcon(TI.keyboard_arrow_down_rounded, size: 24, color: WebC.zinc300),
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
    return GestureDetector(
      onTap: onTap,
      child: Stack(clipBehavior: Clip.none, children: [
        Container(
          width: 46,
          height: 46,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: accent ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]) : null,
            color: accent ? null : (AppColors.isLight ? Colors.white : const Color(0xFF1C1C28)),
            border: accent ? null : Border.all(color: WebC.border),
            boxShadow: [
              BoxShadow(
                color: (accent ? const Color(0xFF6366F1) : Colors.black).withValues(alpha: accent ? 0.4 : (AppColors.isLight ? 0.12 : 0.45)),
                blurRadius: 16,
                offset: const Offset(0, 6),
                spreadRadius: -4,
              ),
            ],
          ),
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
      ]),
    );
  }
}

/// Telegramdagidek: xabarni chapga surib javob berish. Pufakcha chapga siljiydi, o'ngda «javob»
/// belgisi paydo bo'ladi; chegaradan o'tganda titraydi, qo'yib yuborilganda — [onReply].
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
  late final AnimationController _back = AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
  double _dx = 0;
  double _from = 0;
  bool _armed = false;

  @override
  void initState() {
    super.initState();
    _back.addListener(() => setState(() => _dx = _from * (1 - Curves.easeOutCubic.transform(_back.value))));
  }

  @override
  void dispose() {
    _back.dispose();
    super.dispose();
  }

  void _update(DragUpdateDetails d) {
    if (_back.isAnimating) _back.stop();
    // faqat chapga; chegaradan keyin qarshilik
    var next = (_dx + d.delta.dx).clamp(-_max * 1.4, 0.0);
    if (next < -_max) next = -_max - (-next - _max) * 0.35;
    final armed = -next >= _threshold;
    if (armed && !_armed) HapticFeedback.lightImpact();
    setState(() {
      _dx = next;
      _armed = armed;
    });
  }

  void _end([DragEndDetails? _]) {
    if (_armed) widget.onReply();
    _armed = false;
    _from = _dx;
    _back.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) return widget.child;
    final p = (-_dx / _threshold).clamp(0.0, 1.0);
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
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
        Transform.translate(offset: Offset(_dx, 0), child: widget.child),
      ]),
    );
  }
}
