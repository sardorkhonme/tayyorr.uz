import 'dart:async';

import 'package:flutter/material.dart';

/// Vaqtinçalik holat xabari (xato / «Saqlandi» …): [message] kelganda
/// körsatiladi, 5 soniyadan keyin sekin sönib, egallagan joyi ham yiğiladi.
///
/// [message] özgarsa (yoki [trigger] özgarsa) xabar qaytadan körsatiladi —
/// bir xil matn qayta kelganda ham.
class FlashStatus extends StatefulWidget {
  const FlashStatus({
    super.key,
    required this.message,
    required this.builder,
    this.trigger,
    this.duration = const Duration(seconds: 5),
  });

  final String? message;
  final Object? trigger;
  final Widget Function(BuildContext context, String message) builder;
  final Duration duration;

  @override
  State<FlashStatus> createState() => _FlashStatusState();
}

class _FlashStatusState extends State<FlashStatus> {
  String? _shown;
  bool _visible = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _show(widget.message);
  }

  @override
  void didUpdateWidget(FlashStatus old) {
    super.didUpdateWidget(old);
    if (old.message != widget.message || old.trigger != widget.trigger) {
      _show(widget.message);
    }
  }

  void _show(String? m) {
    _timer?.cancel();
    if (m == null || m.isEmpty) {
      _shown = null;
      _visible = false;
      return;
    }
    _shown = m;
    _visible = true;
    _timer = Timer(widget.duration, () {
      if (mounted) setState(() => _visible = false);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shown = _shown;
    return AnimatedSize(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOut,
      alignment: AlignmentDirectional.topStart,
      child: shown == null
          ? const SizedBox.shrink()
          : TweenAnimationBuilder<double>(
              key: ValueKey(Object.hash(shown, widget.trigger)),
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 200),
              builder: (context, t, child) => Opacity(opacity: t, child: child),
              child: AnimatedOpacity(
                opacity: _visible ? 1 : 0,
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeOut,
                onEnd: () {
                  if (!_visible && mounted) setState(() => _shown = null);
                },
                child: widget.builder(context, shown),
              ),
            ),
    );
  }
}

/// Xabar maydoni uçun kiçik saqlagiç: har bir (böş bölmagan) qiymat
/// berilganda [seq] oşadi — [FlashStatus.trigger] ga berilsa, bir xil matn
/// qayta qöyilganda ham xabar yana körinadi.
///
/// ```dart
/// final _errF = FlashValue();
/// String? get _err => _errF.value;
/// set _err(String? v) => _errF.value = v;
/// ...
/// FlashStatus(message: _err, trigger: _errF.seq, builder: ...)
/// ```
class FlashValue<T extends Object> {
  T? _value;
  int seq = 0;

  T? get value => _value;
  set value(T? v) {
    _value = v;
    if (v != null && v != '') seq++;
  }
}
