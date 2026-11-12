import 'dart:async';

import 'package:flutter/widgets.dart';

/// [IndexedStack] — lekin bolalar birdaniga qurilmaydi: avval faqat tanlangan bölim, qolganlari
/// sahifa oçilib bölgaç ([warmUpDelay] dan keyin) bittadan, kadrlar orasida quriladi.
/// Xizmat qobigʼi oçilganda bosiş darhol sezilsin, oçiliş animatsiyasi qotmasin.
class LazyIndexedStack extends StatefulWidget {
  const LazyIndexedStack({
    super.key,
    required this.index,
    required this.children,
    this.warmUpDelay = const Duration(milliseconds: 600),
  });

  final int index;
  final List<Widget> children;
  final Duration warmUpDelay;

  @override
  State<LazyIndexedStack> createState() => _LazyIndexedStackState();
}

class _LazyIndexedStackState extends State<LazyIndexedStack> {
  final _built = <int>{};
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _built.add(widget.index);
    _timer = Timer(widget.warmUpDelay, _warmNext);
  }

  void _warmNext() {
    if (!mounted) return;
    for (var i = 0; i < widget.children.length; i++) {
      if (_built.add(i)) {
        setState(() {});
        _timer = Timer(const Duration(milliseconds: 120), _warmNext);
        return;
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _built.add(widget.index);
    return IndexedStack(
      index: widget.index,
      children: [
        for (var i = 0; i < widget.children.length; i++)
          _built.contains(i) ? widget.children[i] : const SizedBox.shrink(),
      ],
    );
  }
}
