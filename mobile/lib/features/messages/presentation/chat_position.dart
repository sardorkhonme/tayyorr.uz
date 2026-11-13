import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollDirection;

import '../../../core/storage/local_storage.dart';

/// Çatda oxirgi turgan joyni eslab qoliş va qayta oçilganda aynan şu joyga qaytariş
/// (Telegramdagidek). Röyxat teskari (reverse: true) — 0 piksel eng pastki (yangi) xabar.
///
/// Langar — ekrandagi eng pastki körinib turgan xabar: uning id'si va röyxat pastki çetidan
/// masofasi (px). Pastda (≈80px içida) bölsa — «eng pastda» deb saqlanadi.
class ChatScrollMemory {
  ChatScrollMemory({
    required this.chatKey,
    required this.controller,
    required this.listKey,
  }) : saved = LocalStorage.instance.chatPosition(chatKey);

  final String chatKey;
  final ScrollController controller;

  /// Röyxat (ListView) kaliti — körinadigan maydon ölçami şundan olinadi.
  final GlobalKey listKey;

  /// Oçilişdagi saqlangan joy (null — bu çat avval oçilmagan).
  final ({String? id, double dy, bool bottom})? saved;

  ({String? id, double dy, bool bottom})? _last;
  Timer? _writeTimer;
  Timer? _holdTimer;

  /// Joyga qaytariş davom etmoqda — oraliq holatlar saqlanmaydi.
  bool restoring = false;

  /// Foydalanuvçi özi surdi — avtomatik joylaştiriş töxtaydi.
  bool userScrolled = false;

  static const double bottomZone = 80;

  RenderBox? _box(GlobalKey? k) {
    final r = k?.currentContext?.findRenderObject();
    return r is RenderBox && r.attached && r.hasSize ? r : null;
  }

  RenderBox? get _list => _box(listKey);

  /// Röyxat bildirişnomalari: foydalanuvçi surişi va surib bölgandagi joy.
  bool onNotification(ScrollNotification n) {
    if (n.depth != 0) return false;
    if ((n is ScrollStartNotification && n.dragDetails != null) ||
        (n is UserScrollNotification && n.direction != ScrollDirection.idle)) {
      userScrolled = true;
    }
    if (n is ScrollEndNotification && !restoring) captureLater();
    return false;
  }

  Timer? _captureTimer;

  /// Surib bölgaç — biroz kutib (inersiya tugaşi), joyni eslab qolamiz.
  void captureLater() {
    _captureTimer?.cancel();
    _captureTimer = Timer(const Duration(milliseconds: 250), () {
      if (!restoring) capture();
    });
  }

  /// Hozirgi joyni eslab qoliş. [items] — (röyxat kaliti, xabar id'si), id null — mahalliy
  /// (hali yuborilmagan) xabar, langar bölmaydi.
  void capture({Iterable<({String key, String? id})>? items}) {
    if (!controller.hasClients) return;
    final pos = controller.position;
    if (!pos.hasPixels) return;
    if (pos.pixels <= bottomZone) {
      _set((id: null, dy: 0, bottom: true));
      return;
    }
    final list = _list;
    final all = items ?? _items?.call();
    if (list == null || all == null) return;
    final h = list.size.height;
    String? bestId;
    double? bestBottom;
    for (final it in all) {
      if (it.id == null) continue;
      final b = _box(keyOf?.call(it.key));
      if (b == null) continue;
      final top = b.localToGlobal(Offset.zero, ancestor: list).dy;
      final bottom = top + b.size.height;
      if (bottom <= 0 || top >= h) continue;
      if (bestBottom == null || bottom > bestBottom) {
        bestBottom = bottom;
        bestId = it.id;
      }
    }
    if (bestId == null || bestBottom == null) return;
    _set((id: bestId, dy: h - bestBottom, bottom: false));
  }

  /// Ekran beradigan maʼlumot: röyxatdagi elementlar va ularning kalitlari.
  Iterable<({String key, String? id})> Function()? _items;
  GlobalKey? Function(String key)? keyOf;

  void bind({
    required Iterable<({String key, String? id})> Function() items,
    required GlobalKey? Function(String key) keyOf,
  }) {
    _items = items;
    this.keyOf = keyOf;
  }

  void _set(({String? id, double dy, bool bottom}) v) {
    _last = v;
    _writeTimer?.cancel();
    _writeTimer = Timer(const Duration(milliseconds: 400), flush);
  }

  /// Diskka yozib qoyiş (dispose / ilova fonga ketganda — darhol).
  void flush() {
    _writeTimer?.cancel();
    final v = _last;
    if (v == null) return;
    LocalStorage.instance.setChatPosition(
      chatKey,
      id: v.id,
      dy: v.dy,
      bottom: v.bottom,
    );
  }

  void dispose() {
    _captureTimer?.cancel();
    _holdTimer?.cancel();
    flush();
  }

  /// Saqlangan joyga qaytariş. [order] — röyxat kalitlari (eskidan yangiga), [keyForId] — xabar
  /// id'si → röyxat kaliti (yuklanmagan bölsa null), [firstUnreadKey] — birinçi öqilmagan xabar,
  /// [loadOlder] — eskiroq sahifa (yana bor bölsa true). Topilmasa: birinçi öqilmagan, keyin pastki.
  Future<void> restore({
    required List<String> Function() order,
    required String? Function(String id) keyForId,
    required String? Function() firstUnreadKey,
    Future<bool> Function()? loadOlder,
  }) async {
    restoring = true;
    try {
      final s = saved;
      if (s != null && s.bottom) return _toBottom();
      if (s != null && s.id != null) {
        var k = keyForId(s.id!);
        for (
          var page = 0;
          k == null && loadOlder != null && page < 8 && !userScrolled;
          page++
        ) {
          if (!await loadOlder()) break;
          await WidgetsBinding.instance.endOfFrame;
          k = keyForId(s.id!);
        }
        if (k != null && await _scrollToItem(order, k, (_, _) => s.dy)) {
          _hold(k, (_, _) => s.dy);
          return;
        }
      }
      final u = firstUnreadKey();
      // birinçi öqilmagan — ekranning tepasida (ostida yangilari)
      double atTop(double h, double ih) => h - ih - 8;
      if (u != null && await _scrollToItem(order, u, atTop)) {
        _hold(u, atTop);
        return;
      }
      _toBottom();
    } finally {
      restoring = false;
      if (controller.hasClients) capture();
    }
  }

  void _toBottom() {
    if (controller.hasClients && !userScrolled) controller.jumpTo(0);
  }

  /// Xabarni röyxatda qurib (kerak bölsa taxminiy joyga sakrab), uni pastki çetdan [dy] masofaga qöyadi.
  Future<bool> _scrollToItem(
    List<String> Function() order,
    String key,
    double Function(double viewH, double itemH) dy,
  ) async {
    for (var attempt = 0; attempt < 30; attempt++) {
      if (!controller.hasClients || userScrolled) return false;
      if (_box(keyOf?.call(key)) != null) break;
      final keys = order();
      final target = keys.indexOf(key);
      if (target < 0) return false;
      int? lo, hi;
      var sum = 0.0;
      var n = 0;
      for (var i = 0; i < keys.length; i++) {
        final b = _box(keyOf?.call(keys[i]));
        if (b == null) continue;
        lo ??= i;
        hi = i;
        sum += b.size.height;
        n++;
      }
      final pos = controller.position;
      final avg = n == 0 ? 90.0 : sum / n;
      double to;
      if (lo == null || hi == null) {
        final frac = keys.length <= 1
            ? 0.0
            : (keys.length - 1 - target) / (keys.length - 1);
        to = pos.maxScrollExtent * frac;
      } else if (target < lo) {
        // eskiroq (tepada) — piksel oşadi
        to = pos.pixels + (lo - target) * avg;
      } else {
        to = pos.pixels - (target - hi) * avg;
      }
      controller.jumpTo(to.clamp(pos.minScrollExtent, pos.maxScrollExtent));
      await WidgetsBinding.instance.endOfFrame;
    }
    if (_box(keyOf?.call(key)) == null) return false;
    for (var i = 0; i < 3; i++) {
      if (!_align(key, dy)) break;
      await WidgetsBinding.instance.endOfFrame;
    }
    return true;
  }

  /// Bir qadam: xabarni kerakli masofaga. Siljitiş kerak bölsa true.
  bool _align(String key, double Function(double viewH, double itemH) dy) {
    final b = _box(keyOf?.call(key));
    final list = _list;
    if (b == null || list == null || !controller.hasClients) return false;
    final h = list.size.height;
    final top = b.localToGlobal(Offset.zero, ancestor: list).dy;
    final cur = h - (top + b.size.height);
    final delta = cur - dy(h, b.size.height);
    if (delta.abs() < 0.5) return false;
    final pos = controller.position;
    final to = (pos.pixels + delta).clamp(
      pos.minScrollExtent,
      pos.maxScrollExtent,
    );
    if ((to - pos.pixels).abs() < 0.5) return false;
    controller.jumpTo(to);
    return true;
  }

  /// Oçilgandan keyin bir oz vaqt (yangi xabarlar / rasmlar balandligi özgarsa) langarni ushlab turamiz —
  /// foydalanuvçi surguncha.
  void _hold(String key, double Function(double, double) dy) {
    _holdTimer?.cancel();
    var ticks = 0;
    _holdTimer = Timer.periodic(const Duration(milliseconds: 60), (t) {
      if (++ticks > 30 || userScrolled || !controller.hasClients) {
        t.cancel();
        return;
      }
      if (_align(key, dy)) capture();
    });
  }

  /// Oçiliş animatsiyasi uçun: hozir ekranda körinib turgan elementlar, pastdan tepaga tartib raqami bilan.
  Map<String, int> visibleSlots(Iterable<String> keys) {
    final list = _list;
    if (list == null) return const {};
    final h = list.size.height;
    final seen = <(String, double)>[];
    for (final k in keys) {
      final b = _box(keyOf?.call(k));
      if (b == null) continue;
      final top = b.localToGlobal(Offset.zero, ancestor: list).dy;
      final bottom = top + b.size.height;
      if (bottom <= 0 || top >= h) continue;
      seen.add((k, bottom));
    }
    seen.sort((a, b) => b.$2.compareTo(a.$2));
    return {for (var i = 0; i < seen.length; i++) seen[i].$1: i};
  }
}

/// Çat oçilganda körinib turgan xabarlarning ketma-ket paydo bölişi (pastdan tepaga):
/// har biri 260ms, oraliq ~30ms, hammasi ~0.5s içida — şaffofdan, biroz pastdan va 0.96 dan.
class ChatRevealSequence {
  ChatRevealSequence(TickerProvider vsync)
    : controller = AnimationController(
        vsync: vsync,
        duration: const Duration(milliseconds: _total),
      );

  static const _total = 500;
  static const _each = 260;
  static const _step = 30;
  static const _maxDelay = _total - _each;

  final AnimationController controller;
  Map<String, int> _slots = const {};
  final _bySlot = <int, Animation<double>>{};

  /// Boşlaş — [slots]: element kaliti → pastdan tartib raqami (faqat ekrandagilar).
  void start(Map<String, int> slots) {
    _slots = slots;
    controller.forward(from: 0);
  }

  /// Element uçun animatsiya (ekrandan tašqaridagilar — darhol töliq).
  Animation<double> of(String key) {
    final s = _slots[key];
    if (s == null || controller.isCompleted) return kAlwaysCompleteAnimation;
    return _bySlot.putIfAbsent(s, () {
      final delay = math.min(s * _step, _maxDelay);
      return CurvedAnimation(
        parent: controller,
        curve: Interval(
          delay / _total,
          (delay + _each) / _total,
          curve: Curves.easeOutCubic,
        ),
      );
    });
  }

  void dispose() => controller.dispose();
}

/// [ChatRevealSequence] elementi. Daraxt tuzilmasi doim bir xil (animatsiyadan keyin ham) —
/// töliq qiymatda qöşimça qatlam yöq.
class ChatReveal extends StatelessWidget {
  const ChatReveal({super.key, required this.animation, required this.child});
  final Animation<double> animation;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: animation,
      child: AnimatedBuilder(
        animation: animation,
        child: child,
        builder: (context, child) {
          final t = animation.value;
          final s = 0.96 + 0.04 * t;
          return Transform(
            alignment: Alignment.bottomCenter,
            transform: Matrix4.diagonal3Values(s, s, 1)
              ..setTranslationRaw(0, 14 * (1 - t), 0),
            child: child,
          );
        },
      ),
    );
  }
}
