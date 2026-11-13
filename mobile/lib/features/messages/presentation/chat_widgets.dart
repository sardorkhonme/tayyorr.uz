import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import 'package:flutter/services.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/liquid_glass.dart';
import '../../../widgets/web_ui.dart';

/// Telegramdagidek: o'tilgan xabar orqasida yumshoq indigo nur ikki marta
/// "lip-lip" yonib, so'nadi. [flashKey] o'zgarganda animatsiya qayta boshlanadi.
class FlashHighlight extends StatefulWidget {
  const FlashHighlight({
    super.key,
    required this.flashKey,
    required this.child,
  });
  final int? flashKey;
  final Widget child;

  @override
  State<FlashHighlight> createState() => _FlashHighlightState();
}

class _FlashHighlightState extends State<FlashHighlight>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );
  late final Animation<double> _a = TweenSequence<double>([
    TweenSequenceItem(
      tween: Tween(
        begin: 0.0,
        end: 1.0,
      ).chain(CurveTween(curve: Curves.easeOut)),
      weight: 14,
    ),
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.35), weight: 16),
    TweenSequenceItem(tween: Tween(begin: 0.35, end: 1.0), weight: 14),
    TweenSequenceItem(
      tween: Tween(
        begin: 1.0,
        end: 0.0,
      ).chain(CurveTween(curve: Curves.easeIn)),
      weight: 56,
    ),
  ]).animate(_c);

  @override
  void initState() {
    super.initState();
    if (widget.flashKey != null) _c.forward(from: 0);
  }

  @override
  void didUpdateWidget(covariant FlashHighlight old) {
    super.didUpdateWidget(old);
    if (widget.flashKey != null && widget.flashKey != old.flashKey) {
      _c.forward(from: 0);
    }
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

/// Çat ro'yxati (teskari — 0 eng past) ustida o'ng pastdagi suzuvchi tugmalar (barça çatlarda):
///  · «↓ pastga» — foydalanuvçi eng yangi xabarlardan yuqoriga çiqsa paydo böladi, bosilganda
///    eng yangi xabarga silliq tuşadi; yuqorida turganda kelgan yangi xabarlar soni — [unread];
///  · «@» — öqilmagan belgilaşlar bölsa, hisoblagiç bilan. Ikkalasi ham körinsa — ustma-ust
///    (@ tepada, ↓ pastda, 8px oraliq), hech qaçon bir-birini yopmaydi.
class ChatScrollButtons extends StatefulWidget {
  const ChatScrollButtons({
    super.key,
    required this.controller,
    this.mentionCount = 0,
    this.onMention,
    this.onDown,
    this.unread = 0,
  });
  final ScrollController controller;
  final int mentionCount;
  final VoidCallback? onMention;

  /// Yuqorida turganda kelgan (körilmagan) yangi xabarlar.
  final int unread;

  /// Bo'lmasa — ro'yxat boshiga (eng pastga) silliq aylanadi.
  final VoidCallback? onDown;

  /// Şundan uzoqroq yuqoriga çiqilsa — «pastga» tugmasi körinadi.
  static const double showAfter = 200;

  /// Tugmalar ölçami va oraliq.
  static const double size = 46;
  static const double gap = 8;

  @override
  State<ChatScrollButtons> createState() => _ChatScrollButtonsState();
}

class _ChatScrollButtonsState extends State<ChatScrollButtons> {
  bool _showDown = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _onScroll();
    });
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
    final show = p.pixels > ChatScrollButtons.showAfter;
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
    c.animateTo(
      0,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final mention = widget.mentionCount > 0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        _Pop(
          visible: mention,
          child: Padding(
            padding: EdgeInsets.only(
              bottom: _showDown ? ChatScrollButtons.gap : 0,
            ),
            child: _RoundFab(
              semanticLabel: 'Keyingi belgilaş',
              onTap: () {
                HapticFeedback.selectionClick();
                widget.onMention?.call();
              },
              count: widget.mentionCount,
              child: TIcon(
                TI.alternate_email_rounded,
                size: 20,
                color: WebC.indigoSoft,
              ),
            ),
          ),
        ),
        _Pop(
          visible: _showDown,
          child: _RoundFab(
            semanticLabel: 'Eng yangi xabarga',
            onTap: _down,
            count: widget.unread,
            child: TIcon(
              TI.keyboard_arrow_down_rounded,
              size: 24,
              color: WebC.zinc300,
            ),
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
        transitionBuilder: (c, a) => ScaleTransition(
          scale: a,
          child: FadeTransition(opacity: a, child: c),
        ),
        child: visible
            ? KeyedSubtree(key: const ValueKey(1), child: child)
            : const SizedBox(key: ValueKey(0), width: ChatScrollButtons.size),
      ),
    );
  }
}

class _RoundFab extends StatelessWidget {
  const _RoundFab({
    required this.onTap,
    required this.child,
    this.count = 0,
    this.semanticLabel,
  });
  final VoidCallback onTap;
  final Widget child;
  final int count;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    // iOS 26 suzuvchi shisha tugma (ikkalasi bir xil uslubda): bosilganda yorishib kattalashadi
    return Stack(
      clipBehavior: Clip.none,
      children: [
        GlassTap(
          width: ChatScrollButtons.size,
          height: ChatScrollButtons.size,
          strong: true,
          haptic: false,
          onTap: onTap,
          semanticLabel: semanticLabel,
          child: child,
        ),
        if (count > 0)
          Positioned(
            top: -4,
            right: -4,
            child: IgnorePointer(
              child: Container(
                constraints: const BoxConstraints(minWidth: 20),
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF43F5E),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(
                    color: AppColors.isLight
                        ? Colors.white
                        : const Color(0xFF0B0B12),
                    width: 2,
                  ),
                ),
                child: Text(
                  count > 99 ? '99+' : '$count',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Telegramdagidek: xabarni chapga surib javob berish. Pufakcha chapga siljiydi, o'ngda «javob»
/// belgisi paydo bo'ladi; chegaradan o'tganda titraydi, qo'yib yuborilganda — [onReply].
/// O'ngga surilsa — ekrandan ortga qaytadi (chapda «ortga» belgisi chiqadi).
class SwipeToReply extends StatefulWidget {
  const SwipeToReply({
    super.key,
    required this.child,
    required this.onReply,
    this.enabled = true,
  });
  final Widget child;
  final VoidCallback onReply;
  final bool enabled;

  @override
  State<SwipeToReply> createState() => _SwipeToReplyState();
}

class _SwipeToReplyState extends State<SwipeToReply>
    with SingleTickerProviderStateMixin {
  static const _threshold = 64.0;
  static const _max = 96.0;

  /// Qaytish — yengil «prujina» (biroz o'tib ketib, joyiga tushadi).
  late final AnimationController _back = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );
  double _raw = 0; // barmoq haqiqatda qancha surdi
  double _dx = 0; // pufakcha qancha siljigan (qarshilik bilan)
  double _from = 0;
  bool _armed = false;
  bool _backArmed =
      false; // o'ngga yetarlicha surildi — qo'yib yuborilsa ortga qaytadi
  static const _backThreshold = 56.0;

  @override
  void initState() {
    super.initState();
    _back.addListener(
      () => setState(
        () => _dx = _from * (1 - Curves.easeOutBack.transform(_back.value)),
      ),
    );
  }

  @override
  void dispose() {
    _back.dispose();
    super.dispose();
  }

  /// Rezina: qancha ko'p tortilsa, shuncha kam siljiydi.
  static double _rubber(double x, double limit) =>
      limit * (1 - math.exp(-x / limit));

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
      next = -(x <= _threshold
          ? x
          : _threshold + _rubber(x - _threshold, _max - _threshold));
    } else {
      // o'ngga — ortga qaytish: chegaragacha erkin, keyin qarshilik
      next = _raw <= _backThreshold
          ? _raw
          : _backThreshold + _rubber(_raw - _backThreshold, 40);
    }
    final armed = -next >= _threshold;
    final backArmed = next >= _backThreshold;
    if ((armed && !_armed) || (backArmed && !_backArmed)) {
      HapticFeedback.lightImpact();
    }
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
    final p = (-_dx / _threshold).clamp(
      0.0,
      1.0,
    ); // faqat chapga surganda belgi ko'rinadi
    final pb = (_dx / _backThreshold).clamp(
      0.0,
      1.0,
    ); // o'ngga — «ortga» belgisi
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragStart: (_) => _raw = _dx,
      onHorizontalDragUpdate: _update,
      onHorizontalDragEnd: _end,
      onHorizontalDragCancel: _end,
      child: Stack(
        alignment: Alignment.centerRight,
        clipBehavior: Clip.none,
        children: [
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
                  child: TIcon(
                    TI.reply_rounded,
                    size: 18,
                    color: _armed ? Colors.white : WebC.zinc300,
                  ),
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
                  child: TIcon(
                    TI.arrow_back_ios_new_rounded,
                    size: 18,
                    color: _backArmed ? Colors.white : WebC.zinc300,
                  ),
                ),
              ),
            ),
          ),
          Transform.translate(offset: Offset(_dx, 0), child: widget.child),
        ],
      ),
    );
  }
}

/// Yangi xabar paydo bölişi: 220ms ease-out — biroz pastdan kötarilib, şaffofdan çiqadi. Faqat bir marta
/// ([animate] true bölib qurilganda) — keyingi qayta qurilişlarda (server javobi bilan almaşganda)
/// qayta öynamaydi. Daraxt tuzilmasi özgarmaydi (pufakça holati / videolar qayta yaratilmaydi).
///
/// [fly] — öz yuborgan xabarim (Telegramdagidek): yoziş maydonidan «uçib» çiqadi — avval biroz
/// ezilgan va kiçik, harakatlanganda çözilib, joyidan sal öşib ketib, prujinadek (rezinadek) tinçlanadi.
class ChatAppear extends StatefulWidget {
  const ChatAppear({
    super.key,
    required this.animate,
    required this.child,
    this.fromRight = false,
    this.fly = false,
  });
  final bool animate;
  final bool fromRight;
  final bool fly;
  final Widget child;

  @override
  State<ChatAppear> createState() => _ChatAppearState();
}

class _ChatAppearState extends State<ChatAppear>
    with SingleTickerProviderStateMixin {
  AnimationController? _c;
  late final Animation<double> _a;
  bool _fly = false;

  // ζ≈0.55 — ~12% öşib ketadi, ~0.5s da tinçlanadi
  static const _spring = SpringDescription(
    mass: 1,
    stiffness: 300,
    damping: 19,
  );

  @override
  void initState() {
    super.initState();
    if (!widget.animate) return;
    if (widget.fly) {
      _fly = true;
      final c = AnimationController.unbounded(vsync: this);
      _c = c;
      _a = c;
      c.animateWith(
        SpringSimulation(
          _spring,
          0,
          1,
          0,
          tolerance: const Tolerance(distance: 0.003, velocity: 0.05),
        ),
      );
      return;
    }
    final c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    _c = c;
    _a = CurvedAnimation(parent: c, curve: Curves.easeOut);
    c.forward();
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // animatsiyasiz yaratilgan — heç qanday qöşimça qatlam yöq (tarixdagi xabarlar arzon)
    final c = _c;
    if (c == null) return widget.child;
    if (_fly) {
      return AnimatedBuilder(
        animation: c,
        child: widget.child,
        builder: (context, child) {
          final p = c.value;
          final done = c.status != AnimationStatus.forward;
          // tezlik bilan çöziladi (yuqoriga uçganda böyiga), qaytişda — ezilib kengayadi
          final v = done ? 0.0 : (c.velocity / 12).clamp(-1.0, 1.0);
          final squash = (1 - p).clamp(0.0, 1.0) * 0.2;
          final grow = 0.84 + 0.16 * p;
          final stretch = 0.16 * v;
          final sy = grow * (1 - squash) * (1 + stretch);
          final sx = grow * (1 + squash * 0.55) * (1 - stretch * 0.5);
          return Opacity(
            opacity: (p / 0.25).clamp(0.0, 1.0),
            child: Transform(
              alignment: widget.fromRight
                  ? Alignment.bottomRight
                  : Alignment.bottomLeft,
              transform: Matrix4.diagonal3Values(sx, sy, 1)
                ..setTranslationRaw(0, 44 * (1 - p), 0),
              child: child,
            ),
          );
        },
      );
    }
    return FadeTransition(
      opacity: _a,
      child: AnimatedBuilder(
        animation: _a,
        child: widget.child,
        builder: (context, child) => Transform.translate(
          offset: Offset(0, 10 * (1 - _a.value)),
          child: child,
        ),
      ),
    );
  }
}

/// Sahifa oçiliş animatsiyasi tugagunça ([routeSettled] false) ogʼir röyxatni qurmaslik uçun —
/// bosiş darhol sezilsin, sahifa silliq kirib kelsin (ungaça skelet körinadi).
mixin RouteSettleMixin<T extends StatefulWidget> on State<T> {
  bool routeSettled = false;
  Animation<double>? _routeAnim;
  bool _routeChecked = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_routeChecked) return;
    _routeChecked = true;
    final a = ModalRoute.of(context)?.animation;
    if (a == null || a.status == AnimationStatus.completed) {
      routeSettled = true;
      return;
    }
    _routeAnim = a..addStatusListener(_onRouteStatus);
    // ehtiyot: animatsiya qandaydir sabab bilan tugamasa ham kontent köp kutmasin
    Future.delayed(const Duration(milliseconds: 600), _settle);
  }

  void _onRouteStatus(AnimationStatus s) {
    if (s == AnimationStatus.completed) _settle();
  }

  void _settle() {
    _routeAnim?.removeStatusListener(_onRouteStatus);
    _routeAnim = null;
    if (!routeSettled && mounted) setState(() => routeSettled = true);
  }

  @override
  void dispose() {
    _routeAnim?.removeStatusListener(_onRouteStatus);
    _routeAnim = null;
    super.dispose();
  }
}
