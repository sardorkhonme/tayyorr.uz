import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart' show CancelToken;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../core/media/media_cache.dart';
import '../../core/network/api_exception.dart';
import '../../core/realtime/realtime_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/ui/app_dialogs.dart';
import '../../core/utils/format.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/aurora_background.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/date_time_picker.dart';
import '../../widgets/link_text.dart';
import '../../widgets/skeleton.dart';
import '../../widgets/user_avatar.dart';
import '../../widgets/web_ui.dart';
import '../messages/data/message_model.dart';
import '../messages/presentation/chat_composer.dart';
import '../messages/presentation/chat_media.dart';
import '../messages/presentation/chat_widgets.dart';
import '../auth/bloc/auth_bloc.dart';
import '../public_profile/presentation/public_profile_screen.dart';
import 'family_entry.dart';
import 'family_models.dart';
import 'family_popup.dart';
import 'family_repository.dart';

/// «Tayyorr's Family» — faqat ilovadagi umumiy guruh.
///  · real vaqt — faqat shu oyna ochiq turganda ("family" kanali, xabar mazmuni signal ichida);
///  · oddiy xabar bildirishnomasiz; @belgilash / javob / admin «hammaga bildirish» — push;
///  · yuborish tugmasini bosib turish: «Rejalashtirish» (hamma), «Hammaga bildirib yuborish» (admin);
///  · admin — 📎 chapidagi dumaloq tugmadan qaysi nomdan yozishni tanlaydi (o'zi / Tayyorr.uz / Support).
class FamilyScreen extends StatefulWidget {
  const FamilyScreen({super.key});

  /// Ochiq bo'lsa — guruh bildirishnomalari ko'rsatilmaydi.
  static bool isOpen = false;

  @override
  State<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends State<FamilyScreen> with WidgetsBindingObserver {
  final _repo = FamilyRepository.instance;
  final _live = RealtimeService.family();
  StreamSubscription<RealtimeEvent>? _sub;
  bool _wasConnected = false;

  final _text = TextEditingController();
  final _focus = FocusNode();
  final _scroll = ScrollController();
  final _listKey = GlobalKey();

  bool _loading = true;
  String? _error;
  FamilyMe? _me;
  List<FamilyMessage> _messages = [];
  List<FamilyMessage> _pinned = [];
  List<FamilyMessage> _scheduled = [];
  bool _hasMore = false;
  bool _loadingOlder = false;
  int _maxUpdated = 0;
  int _pinIndex = 0;

  /// O'qilmagan belgilashlar (eskisidan yangisiga).
  final List<String> _mentionQueue = [];
  final Set<String> _mentionSeen = {};

  /// Shu qurilmadan yuborilganlar (Tayyorr.uz nomidan yozilgani ham «meniki»).
  final Set<String> _sentIds = {};

  /// Optimistik yuborilayotganlar: clientId → yuborish ma'lumoti (qayta yuborish uchun).
  final Map<String, _Outgoing> _outbox = {};
  final Set<String> _myClientIds = {};

  /// Paydo bo'lish animatsiyasi o'ynaydigan (yangi) xabarlar kaliti.
  final Set<String> _fresh = {};

  /// Tahrirlanayotgan o'z xabarim.
  FamilyMessage? _editing;
  Timer? _byTimer;
  String? _uid;

  String _as = 'self';
  FamilyMessage? _replyTo;
  PendingAttachment? _pending;
  CancelToken? _uploadToken;

  // @ — taklif
  int? _mentionStart;
  String? _mentionQuery;
  List<FamilyAuthor> _suggest = const [];
  Timer? _suggestTimer;

  Timer? _readTimer;
  int _readSent = 0;
  Timer? _nextTimer;
  Timer? _visTimer;
  Timer? _onlineTimer;
  int? _members;
  int? _online;

  final _keys = <String, GlobalKey>{};
  final _bubbleKeys = <String, GlobalKey>{};
  String? _flashId;
  int _flashTick = 0;
  GlobalKey _keyFor(String id) => _keys.putIfAbsent(id, GlobalKey.new);

  bool get _isAdmin => _me?.isAdmin ?? false;

  @override
  void initState() {
    super.initState();
    FamilyScreen.isOpen = true;
    FamilySummary.instance.clear();
    WidgetsBinding.instance.addObserver(this);
    _scroll.addListener(_onScroll);
    _text.addListener(_onText);
    _sub = _live.events.listen(_onEvent);
    _live.connected.addListener(_onConnected);
    _live.start();
    _uid = context.read<AuthBloc>().state.user?.id;
    _enter();
    _startOnline();
  }

  /// Kirish: keshdagi xabarlar darhol (shimmersiz), keyin faqat yangilari / o'zgarganlari.
  Future<void> _enter() async {
    final uid = _uid;
    final cache = FamilyCache.instance;
    if (uid != null && (cache.has(uid) || await cache.restore(uid)) && mounted && _messages.isEmpty) {
      setState(() {
        _me ??= cache.me;
        _messages = List.of(cache.messages);
        _pinned = List.of(cache.pinned);
        _hasMore = cache.hasMore;
        _maxUpdated = cache.maxUpdated;
        _members ??= cache.members;
        _online ??= cache.online;
        _loading = false;
      });
      await _catchUp();
      await _load();
      _scheduleRead();
    } else {
      await _load(initial: true);
    }
  }

  void _saveCache() {
    final uid = _uid ?? _me?.id;
    if (uid == null || _messages.isEmpty) return;
    FamilyCache.instance.save(
      uid,
      me: _me,
      messages: _messages,
      pinned: _pinned,
      hasMore: _hasMore,
      maxUpdated: _maxUpdated,
      members: _members,
      online: _online,
    );
  }

  @override
  void dispose() {
    _saveCache();
    _byTimer?.cancel();
    FamilyScreen.isOpen = false;
    WidgetsBinding.instance.removeObserver(this);
    _sub?.cancel();
    _live.connected.removeListener(_onConnected);
    _live.stop();
    _readTimer?.cancel();
    _nextTimer?.cancel();
    _visTimer?.cancel();
    _onlineTimer?.cancel();
    _suggestTimer?.cancel();
    _uploadToken?.cancel();
    _text.dispose();
    _focus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.paused) {
      _saveCache();
      _live.stop();
      _onlineTimer?.cancel();
    } else if (s == AppLifecycleState.resumed) {
      _live.start();
      _catchUp();
      _startOnline(now: true);
    }
  }

  /// Ochiq va oldingi planda — har 60 soniyada a'zolar / onlayn soni.
  void _startOnline({bool now = false}) {
    _onlineTimer?.cancel();
    _onlineTimer = Timer.periodic(const Duration(seconds: 60), (_) => _refreshOnline());
    if (now) _refreshOnline();
  }

  Future<void> _refreshOnline() async {
    try {
      final r = await _repo.online();
      if (!mounted) return;
      setState(() {
        _members = r.members ?? _members;
        _online = r.online ?? _online;
      });
    } catch (_) {}
  }

  void _onConnected() {
    final c = _live.connected.value;
    // qayta ulanganda — uzilish paytida o'tkazib yuborilganlar
    if (c && _wasConnected) _catchUp();
    if (c) _wasConnected = true;
  }

  // ───────────────────────── ma'lumot ─────────────────────────

  bool _isMine(FamilyMessage m) => m.mine ?? _guessMine(m);

  /// Faqat yangi (ro'yxatda yo'q) xabar uchun: men yozganmanmi.
  bool _guessMine(FamilyMessage m) =>
      (m.author.isUser && m.author.id == (_me?.id ?? _uid)) ||
      _sentIds.contains(m.id) ||
      (m.clientId != null && _myClientIds.contains(m.clientId));

  /// Kelgan xabarni mavjudi bilan birlashtirish: `mine` hech qachon «sakramaydi» (bor bo'lsa saqlanadi),
  /// clientId va admin uchun `by` ham yo'qolmaydi.
  FamilyMessage _resolve(FamilyMessage m, FamilyMessage? old) {
    final mine = m.mine ?? old?.mine ?? _guessMine(m);
    return m.copyWith(mine: mine, clientId: m.clientId ?? old?.clientId, by: m.by ?? old?.by, status: FamilySendStatus.sent);
  }

  int _indexOf(FamilyMessage m) {
    final i = _messages.indexWhere((x) => x.id == m.id);
    if (i >= 0 || m.clientId == null) return i;
    return _messages.indexWhere((x) => x.clientId == m.clientId);
  }

  Future<void> _load({bool initial = false}) async {
    try {
      final r = await _repo.load();
      if (!mounted) return;
      final me = FamilyMe.fromJson(Map<String, dynamic>.from(r['me'] as Map));
      List<FamilyMessage> list(Object? v) => (v as List? ?? const [])
          .whereType<Map>()
          .map((m) => FamilyMessage.fromJson(Map<String, dynamic>.from(m)))
          .toList();
      final msgs = list(r['messages']);
      setState(() {
        _me = me;
        _members = (r['members'] as num?)?.toInt() ?? _members;
        _online = (r['online'] as num?)?.toInt() ?? _online;
        _loading = false;
        _error = null;
        final page = msgs.where((m) => !m.deleted).toList();
        final sent = _messages.where((m) => !m.isLocal).toList();
        // keshdagilar bilan oradagi bo'shliq (ko'p yangi xabar) — ro'yxat yangidan
        final gap = sent.isNotEmpty && page.isNotEmpty && (r['hasMore'] as bool? ?? false) && page.first.sendAt.isAfter(sent.last.sendAt);
        if (initial || sent.isEmpty || gap) {
          final local = _messages.where((m) => m.isLocal).toList();
          _messages = [for (final m in page) _resolve(m, null), ...local];
          _hasMore = r['hasMore'] as bool? ?? false;
        } else {
          for (final m in msgs) {
            _upsert(m);
          }
        }
        for (final m in msgs) {
          if (m.updatedAt > _maxUpdated) _maxUpdated = m.updatedAt;
        }
        _pinned = list(r['pinned']);
        _scheduled = list(r['scheduled']);
        for (final id in (r['mentionIds'] as List? ?? const []).map((e) => '$e')) {
          if (_mentionSeen.add(id)) _mentionQueue.add(id);
        }
      });
      _armNext((r['nextAt'] as num?)?.toInt());
      if (initial) _scheduleRead();
      _saveCache();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = "Yuklab bölmadi — internetni tekşiring";
      });
    }
  }

  /// Uzilishdan / fondan qaytganda — o'zgarganlar.
  Future<void> _catchUp() async {
    if (_messages.isEmpty || _maxUpdated == 0) return _load();
    try {
      final list = await _repo.since(_maxUpdated);
      if (!mounted || list.isEmpty) return;
      setState(() {
        for (final m in list) {
          _upsert(m);
        }
      });
      _scheduleRead();
    } catch (_) {}
  }

  /// Eng yaqin rejalashtirilgan xabar vaqtida qayta so'raymiz — server o'shanda yuboradi.
  void _armNext(int? at) {
    _nextTimer?.cancel();
    if (at == null) return;
    final ms = (at - DateTime.now().millisecondsSinceEpoch + 1500).clamp(1000, 24 * 3600 * 1000);
    _nextTimer = Timer(Duration(milliseconds: ms), () {
      if (mounted) _load();
    });
  }

  /// Ro'yxatga qo'shish / yangilash (setState ichida chaqiriladi).
  void _upsert(FamilyMessage m) {
    if (m.updatedAt > _maxUpdated) _maxUpdated = m.updatedAt;
    if (m.deleted) return _remove(m.id);
    _scheduled.removeWhere((x) => x.id == m.id);
    if (m.scheduled) return;
    final i = _indexOf(m);
    if (i >= 0) {
      // o'z joyida almashtiramiz (kalit — clientId ?? id — o'zgarmaydi: yo'qolib qayta chiqmaydi)
      _messages[i] = m = _resolve(m, _messages[i]);
      if (m.clientId != null) _outbox.remove(m.clientId);
    } else {
      m = _resolve(m, null);
      var at = _messages.length;
      while (at > 0 && _messages[at - 1].sendAt.isAfter(m.sendAt)) {
        at--;
      }
      _messages.insert(at, m);
    }
    final p = _pinned.indexWhere((x) => x.id == m.id);
    if (m.pinned) {
      if (p >= 0) {
        _pinned[p] = m;
      } else {
        _pinned.insert(0, m);
        _pinIndex = 0;
      }
    } else if (p >= 0) {
      _pinned.removeAt(p);
    }
  }

  void _remove(String id) {
    _messages.removeWhere((x) => x.id == id);
    _pinned.removeWhere((x) => x.id == id);
    _scheduled.removeWhere((x) => x.id == id);
    _mentionQueue.remove(id);
  }

  void _onEvent(RealtimeEvent ev) {
    if (ev.name != 'family' || !mounted) return;
    final e = ev.data['e'];
    final id = '${ev.data['id'] ?? ''}';
    if (e == 'del') {
      setState(() => _remove(id));
      return;
    }
    final raw = ev.data['m'];
    if (raw is! String) return;
    FamilyMessage m;
    try {
      m = FamilyMessage.fromJson(Map<String, dynamic>.from(jsonDecode(raw) as Map));
    } catch (_) {
      return;
    }
    final isNew = _indexOf(m) < 0;
    final old = isNew ? null : _messages[_indexOf(m)];
    final mine = m.mine ?? old?.mine ?? _guessMine(m);
    final nearBottom = _nearBottom;
    setState(() {
      if (isNew && e == 'new') _markFresh(m.stableKey);
      _upsert(m);
      if (e == 'new' && isNew && !mine && _me != null && m.mentionsMe(_me!.id, _isAdmin) && !nearBottom) {
        if (_mentionSeen.add(m.id)) _mentionQueue.add(m.id);
      }
    });
    if (e == 'new' && isNew) {
      if (nearBottom || mine) WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
      if (nearBottom) _scheduleRead();
    }
    // admin: Tayyorr.uz / Support nomidagi xabarning haqiqiy muallifi realtime'da kelmaydi — ?since bilan olamiz
    if (_isAdmin && m.author.isOfficial && m.by == null && old?.by == null) {
      _byTimer?.cancel();
      _byTimer = Timer(const Duration(milliseconds: 700), _catchUp);
    }
  }

  // ───────────────────────── scroll / o'qildi ─────────────────────────

  bool get _nearBottom => !_scroll.hasClients || _scroll.offset < 160;

  void _onScroll() {
    if (!_scroll.hasClients) return;
    final p = _scroll.position;
    // ro'yxat teskari: yuqori (eski) — maxScrollExtent
    if (p.hasContentDimensions && p.pixels > p.maxScrollExtent - 400) _loadOlder();
    if (_nearBottom) _scheduleRead();
    if (_mentionQueue.isNotEmpty) {
      _visTimer ??= Timer(const Duration(milliseconds: 250), () {
        _visTimer = null;
        _checkVisibleMentions();
      });
    }
  }

  /// Ekranda ko'ringan belgilash — o'qilgan hisoblanadi.
  void _checkVisibleMentions() {
    if (!mounted || _mentionQueue.isEmpty) return;
    final seen = _mentionQueue.where(_isVisible).toList();
    if (seen.isNotEmpty) setState(() => _mentionQueue.removeWhere(seen.contains));
  }

  /// Xabar id'si → ro'yxatdagi barqaror kalit.
  String _kOf(String id) {
    for (final m in _messages) {
      if (m.id == id) return m.stableKey;
    }
    return id;
  }

  bool _isVisible(String id) {
    final ctx = _keys[_kOf(id)]?.currentContext;
    final listCtx = _listKey.currentContext;
    if (ctx == null || listCtx == null) return false;
    final box = ctx.findRenderObject();
    final list = listCtx.findRenderObject();
    if (box is! RenderBox || list is! RenderBox || !box.attached || !list.attached) return false;
    final top = box.localToGlobal(Offset.zero, ancestor: list).dy;
    return top < list.size.height - 20 && top + box.size.height > 20;
  }

  void _scheduleRead() {
    _readTimer?.cancel();
    _readTimer = Timer(const Duration(milliseconds: 800), () {
      if (!mounted || !_nearBottom) return;
      final sent = _messages.where((m) => !m.isLocal);
      if (sent.isEmpty) return;
      final at = sent.last.sendAtMs;
      if (at <= _readSent) return;
      _readSent = at;
      _repo.read(at).catchError((_) {});
    });
  }

  void _scrollToBottom() {
    if (!_scroll.hasClients) return;
    final pos = _scroll.position;
    if (!pos.hasContentDimensions || pos.pixels <= 0) return;
    _scroll.animateTo(0, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  Future<void> _loadOlder() async {
    if (_loadingOlder || !_hasMore || _messages.isEmpty) return;
    setState(() => _loadingOlder = true);
    try {
      final r = await _repo.older(_messages.first.sendAtMs);
      if (!mounted) return;
      setState(() {
        final have = _messages.map((m) => m.id).toSet();
        _messages.insertAll(0, r.messages.where((m) => !m.deleted && !have.contains(m.id)));
        _hasMore = r.hasMore;
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  /// Xabarga o'tish (kerak bo'lsa eskilarini yuklab) va uni «lip-lip» yondirish.
  Future<void> _jumpTo(String id) async {
    var index = _messages.indexWhere((m) => m.id == id);
    for (var page = 0; index < 0 && _hasMore && page < 12; page++) {
      await _loadOlder();
      index = _messages.indexWhere((m) => m.id == id);
    }
    if (!mounted) return;
    if (index < 0) {
      showToast(context, "Xabar topilmadi (öçirilgan bölişi mumkin)");
      return;
    }
    final key = _messages[index].stableKey;
    for (var attempt = 0; attempt < 4 && _keys[key]?.currentContext == null; attempt++) {
      if (!_scroll.hasClients) return;
      final pos = _scroll.position;
      final frac = _messages.length <= 1 ? 0.0 : (_messages.length - 1 - index) / (_messages.length - 1);
      _scroll.jumpTo((pos.maxScrollExtent * frac).clamp(0.0, pos.maxScrollExtent));
      await WidgetsBinding.instance.endOfFrame;
    }
    final ctx = _keys[key]?.currentContext;
    if (ctx == null || !ctx.mounted) return;
    await Scrollable.ensureVisible(ctx, alignment: 0.4, duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
    if (!mounted) return;
    setState(() {
      _flashId = key;
      _flashTick++;
    });
  }

  void _nextMention() {
    if (_mentionQueue.isEmpty) return;
    final id = _mentionQueue.removeAt(0);
    setState(() {});
    _jumpTo(id);
  }

  // ───────────────────────── yuborish ─────────────────────────

  Future<void> _send({bool notifyAll = false, DateTime? at}) async {
    if (_editing != null) return _saveEdit();
    final pending = _pending;
    if (pending != null && !pending.ready) return;
    final text = _text.text;
    if (text.trim().isEmpty && pending == null) return;
    final reply = _replyTo;
    _text.clear();
    setState(() {
      _pending = null;
      _replyTo = null;
      _suggest = const [];
      _mentionStart = null;
    });
    // rejalashtirilgan — ro'yxatga emas, «Rejalaştirilgan» ga tushadi
    if (at != null) return _sendScheduled(text, reply, pending, at);

    final clientId = 'c${DateTime.now().microsecondsSinceEpoch}';
    _myClientIds.add(clientId);
    final myName = context.read<AuthBloc>().state.user?.displayName ?? 'Men';
    ChatFileModel? file;
    if (pending != null) {
      // mahalliy fayl xabarning doimiy kesh kalitiga — server javobidan keyin qayta yuklanmaydi
      await MediaCache.instance.adopt(pending.localKey, 'f-$clientId', pending.name);
      file = ChatFileModel(name: pending.name, type: pending.type, size: pending.size, url: '');
    }
    if (!mounted) return;
    final who = _identity ??
        FamilyAuthor(kind: 'user', id: _me?.id ?? _uid ?? '', name: myName);
    final local = FamilyMessage(
      id: 'local:$clientId',
      author: who,
      mine: true,
      body: text.trim(),
      file: file,
      expiredFile: null,
      replyTo: reply == null ? null : FamilyReply(id: reply.id, authorName: reply.author.name, text: reply.preview, deleted: false),
      mentions: const [],
      notifyAll: notifyAll,
      pinned: false,
      scheduled: false,
      sendAt: DateTime.now(),
      updatedAt: 0,
      deleted: false,
      clientId: clientId,
      status: FamilySendStatus.pending,
    );
    _outbox[clientId] = _Outgoing(body: text, replyToId: reply?.id, as: _as, notifyAll: notifyAll, file: pending?.prepared);
    setState(() {
      _markFresh(clientId);
      _messages.add(local);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    await _deliver(clientId);
  }

  /// Optimistik xabarni serverga yuborish (qayta yuborishda ham).
  Future<void> _deliver(String clientId) async {
    final o = _outbox[clientId];
    if (o == null) return;
    void mark(FamilySendStatus st) {
      final i = _messages.indexWhere((x) => x.clientId == clientId && x.isLocal);
      if (i >= 0) _messages[i] = _messages[i].copyWith(status: st);
    }

    setState(() => mark(FamilySendStatus.pending));
    try {
      final m = await _repo.send(body: o.body, replyToId: o.replyToId, as: o.as, notifyAll: o.notifyAll, file: o.file, clientId: clientId);
      _sentIds.add(m.id);
      if (!mounted) return;
      // realtime oldinroq kelgan bo'lsa — o'sha joyda yangilanadi, dublikat bo'lmaydi
      setState(() => _upsert(m.copyWith(clientId: clientId, mine: true)));
      _outbox.remove(clientId);
      if (o.notifyAll) showToast(context, 'Hammaga bildirib yuborildi', kind: ToastKind.success);
    } catch (e) {
      if (!mounted) return;
      // realtime orqali yetib kelgan bo'lsa — xato emas
      if (!_messages.any((x) => x.clientId == clientId && !x.isLocal)) {
        setState(() => mark(FamilySendStatus.failed));
        if (e is ApiException) showToast(context, e.message, kind: ToastKind.error);
      }
    }
  }

  /// Animatsiya bir marta o'ynaydi — keyin (ro'yxatdan chiqib-kirsa ham) qayta o'ynamaydi.
  void _markFresh(String k) {
    _fresh.add(k);
    Future.delayed(const Duration(milliseconds: 500), () => _fresh.remove(k));
  }

  void _discardLocal(FamilyMessage m) {
    _outbox.remove(m.clientId);
    setState(() => _messages.removeWhere((x) => x.clientId == m.clientId && x.isLocal));
  }

  void _failedMenu(FamilyMessage m) {
    showAppSheet(
      context,
      title: 'Xabar yuborilmadi',
      builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, children: [
        AppSheetAction(icon: TI.refresh_rounded, label: 'Qayta yuboriş', onTap: () {
          Navigator.of(ctx).pop();
          _deliver(m.clientId!);
        }),
        AppSheetAction(icon: TI.delete_outline_rounded, label: 'Öçiriş', danger: true, onTap: () {
          Navigator.of(ctx).pop();
          _discardLocal(m);
        }),
      ]),
    );
  }

  Future<void> _sendScheduled(String text, FamilyMessage? reply, PendingAttachment? pending, DateTime at) async {
    try {
      final m = await _repo.send(body: text, replyToId: reply?.id, as: _as, sendAt: at, file: pending?.prepared);
      if (pending != null) await MediaCache.instance.adopt(pending.localKey, m.cacheKey, pending.name);
      _sentIds.add(m.id);
      if (!mounted) return;
      if (m.scheduled) {
        setState(() {
          _scheduled.add(m.withMine(true));
          _scheduled.sort((a, b) => a.sendAt.compareTo(b.sendAt));
        });
        _armNext(_scheduled.first.sendAtMs);
        showToast(context, 'Rejalaştirildi: ${shortDateTime(m.sendAt)}', kind: ToastKind.success);
      } else {
        setState(() => _upsert(m.withMine(true)));
      }
    } catch (e) {
      if (!mounted) return;
      if (_text.text.isEmpty) _text.text = text;
      setState(() {
        _replyTo ??= reply;
        _pending ??= pending;
      });
      showToast(context, e is ApiException ? e.message : "Yuborib bölmadi — qayta urinib köring", kind: ToastKind.error);
    }
  }

  void _startEdit(FamilyMessage m) {
    setState(() {
      _editing = m;
      _replyTo = null;
    });
    _text.value = TextEditingValue(text: m.body, selection: TextSelection.collapsed(offset: m.body.length));
    _focus.requestFocus();
  }

  void _cancelEdit() {
    setState(() => _editing = null);
    _text.clear();
  }

  /// Tahrir: darhol ko'rsatiladi, server rad etsa — qaytariladi.
  Future<void> _saveEdit() async {
    final m = _editing;
    final text = _text.text.trim();
    if (m == null || text.isEmpty) return;
    setState(() => _editing = null);
    _text.clear();
    if (text == m.body) return;
    final i = _indexOf(m);
    final before = i >= 0 ? _messages[i] : m;
    if (i >= 0) setState(() => _messages[i] = before.copyWith(body: text, edited: true));
    try {
      final r = await _repo.edit(m.id, text);
      if (mounted) setState(() => _upsert(r));
    } catch (e) {
      if (!mounted) return;
      final j = _indexOf(m);
      if (j >= 0) setState(() => _messages[j] = before);
      showToast(context, e is ApiException ? e.message : "Tahrirlab bölmadi", kind: ToastKind.error);
    }
  }

  /// Yuborish tugmasini bosib turish — Telegramdagidek menyu.
  Future<void> _sendMenu() async {
    if (_editing != null) return;
    final v = await showAppSheet<String>(
      context,
      title: 'Yuboriş',
      builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, children: [
        AppSheetAction(icon: TI.schedule_rounded, label: 'Rejalaştiriş', onTap: () => Navigator.of(ctx).pop('schedule')),
        if (_isAdmin)
          AppSheetAction(icon: TI.campaign_rounded, label: 'Hammaga bildirib yuboriş', onTap: () => Navigator.of(ctx).pop('all')),
      ]),
    );
    if (!mounted || v == null) return;
    if (v == 'all') {
      await _send(notifyAll: true);
    } else if (v == 'schedule') {
      // standart — 1 soatdan keyin, 5 daqiqagacha yaxlitlangan
      final base = DateTime.now().add(const Duration(hours: 1));
      final initial = DateTime(base.year, base.month, base.day, base.hour, ((base.minute + 4) ~/ 5) * 5);
      final at = await pickDateTime(context, initial: initial);
      if (at == null || !mounted) return;
      if (at.isBefore(DateTime.now().add(const Duration(minutes: 1)))) {
        showToast(context, "Kelajakdagi vaqtni tanlang", kind: ToastKind.error);
        return;
      }
      await _send(at: at);
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    await _stage(file.bytes!, file.name, mimeForExt((file.extension ?? '').toLowerCase()));
  }

  Future<void> _onRecorded(String path, Duration _) async {
    final f = File(path);
    final bytes = await f.readAsBytes();
    await _stage(bytes, path.split('/').last, 'audio/mp4');
    unawaited(f.delete().catchError((_) => f));
  }

  Future<void> _stage(Uint8List bytes, String name, String type) async {
    _cancelPending();
    if (bytes.length > 100 * 1024 * 1024) {
      showToast(context, 'Fayl 100MB dan katta', kind: ToastKind.error);
      return;
    }
    final key = 'local-${DateTime.now().microsecondsSinceEpoch}';
    await MediaCache.instance.putLocal(key, name, bytes);
    final pending = PendingAttachment(localKey: key, name: name, type: type, size: bytes.length);
    final token = CancelToken();
    if (!mounted) return;
    setState(() {
      _pending = pending;
      _uploadToken = token;
    });
    try {
      final prepared = await _repo.upload(
        bytes: bytes,
        filename: name,
        contentType: type,
        cancelToken: token,
        onProgress: (p) {
          if (mounted && identical(_pending, pending)) setState(() => pending.progress = p);
        },
      );
      if (mounted && identical(_pending, pending)) setState(() => pending.prepared = prepared);
    } catch (_) {
      if (token.isCancelled || !mounted || !identical(_pending, pending)) return;
      setState(() => _pending = null);
      showToast(context, "Faylni yuklab bölmadi — qayta urinib köring", kind: ToastKind.error);
    }
  }

  void _cancelPending() {
    _uploadToken?.cancel();
    _uploadToken = null;
    if (_pending != null && mounted) setState(() => _pending = null);
  }

  // ───────────────────────── @ taklif ─────────────────────────

  void _onText() {
    final v = _text.value;
    final cur = v.selection.baseOffset;
    if (cur < 0 || cur > v.text.length) return _closeSuggest();
    var i = cur;
    while (i > 0 && RegExp(r'[A-Za-z0-9_.]').hasMatch(v.text[i - 1])) {
      i--;
    }
    if (i == 0 || v.text[i - 1] != '@' || (i >= 2 && !RegExp(r'\s').hasMatch(v.text[i - 2]))) return _closeSuggest();
    final q = v.text.substring(i, cur);
    if (q.length > 32) return _closeSuggest();
    _mentionStart = i - 1;
    if (q == _mentionQuery) return;
    _mentionQuery = q;
    _suggestTimer?.cancel();
    _suggestTimer = Timer(const Duration(milliseconds: 250), () async {
      try {
        final list = await _repo.mention(q);
        if (!mounted || _mentionQuery != q || _mentionStart == null) return;
        setState(() => _suggest = list.take(3).toList());
      } catch (_) {}
    });
  }

  void _closeSuggest() {
    _suggestTimer?.cancel();
    _mentionQuery = null;
    _mentionStart = null;
    if (_suggest.isNotEmpty) setState(() => _suggest = const []);
  }

  void _insertMention(FamilyAuthor a) {
    final start = _mentionStart;
    final v = _text.value;
    final cur = v.selection.baseOffset;
    if (start == null || cur < start || a.login == null) return;
    final insert = '@${a.login} ';
    final text = v.text.replaceRange(start, cur, insert);
    _text.value = TextEditingValue(text: text, selection: TextSelection.collapsed(offset: start + insert.length));
    _closeSuggest();
  }

  // ───────────────────────── amallar ─────────────────────────

  void _openProfile(FamilyAuthor a) {
    if (!a.isUser || a.id == _me?.id) return;
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => PublicProfileScreen(userId: a.id, allowMessage: false)));
  }

  void _openProfileByMention(FamilyMention m) {
    if (m.id == 'brand' || m.id == 'support' || m.id == _me?.id) return;
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => PublicProfileScreen(userId: m.id, allowMessage: false)));
  }

  void _setReply(FamilyMessage m) {
    if (m.deleted) return;
    setState(() => _replyTo = m);
    _focus.requestFocus();
  }

  /// Bitta bosish — zamonaviy popup: xira fon, xabar o'z joyida, tepada reaksiyalar, pastda amallar.
  Future<void> _openPopup(FamilyMessage m) async {
    if (m.deleted) return;
    if (m.isLocal) {
      if (m.status == FamilySendStatus.failed) _failedMenu(m);
      return;
    }
    final idx = _messages.indexWhere((x) => x.id == m.id);
    final box = _bubbleKeys[m.stableKey]?.currentContext?.findRenderObject();
    if (idx < 0 || box is! RenderBox || !box.attached) return;
    final rect = box.localToGlobal(Offset.zero) & box.size;
    final cur = _messages[idx];
    final mine = _isMine(cur);
    final reactions = cur.reactions.fold<int>(0, (a, r) => a + r.count);
    final v = await showFamilyPopup(
      context,
      rect: rect,
      preview: SizedBox(width: rect.width, child: _bubble(cur, mine, _flags(idx), previewOnly: true)),
      alignRight: mine,
      myReaction: _me == null ? null : cur.myReaction(_me!.id),
      seen: cur.seen,
      reactionsCount: reactions,
      actions: [
        const FamilyPopupAction('reply', TI.reply_rounded, 'Javob beriş'),
        if (cur.body.isNotEmpty) const FamilyPopupAction('copy', TI.copy_rounded, 'Nusxa oliş'),
        if (mine && cur.body.isNotEmpty)
          const FamilyPopupAction('edit', TI.edit_outlined, 'Tahrirlaş'),
        if (cur.file != null)
          FamilyPopupAction('save', TI.download_rounded, cur.file!.isImage || cur.file!.isVideo ? 'Galereyaga saqlaş' : 'Yuklab oliş'),
        if (_isAdmin) FamilyPopupAction('pin', cur.pinned ? TI.push_pin_outlined : TI.push_pin_rounded, cur.pinned ? 'Qadaşdan oliş' : 'Qadaş'),
        if (mine || _isAdmin) const FamilyPopupAction('delete', TI.delete_outline_rounded, 'Öçiriş', danger: true),
        if (!mine) const FamilyPopupAction('report', TI.flag_outlined, 'Şikoyat qiliş', danger: true),
      ],
    );
    if (v == null || !mounted) return;
    if (v.startsWith('emoji:')) return _react(cur.id, v.substring(6));
    switch (v) {
      case 'people:seen':
        showFamilyPeople(context, cur.id);
      case 'people:reactions':
        showFamilyPeople(context, cur.id, reactions: true);
      case 'reply':
        _setReply(cur);
      case 'copy':
        Clipboard.setData(ClipboardData(text: cur.body));
        showToast(context, 'Nusxalandi', kind: ToastKind.success);
      case 'save':
        saveChatFile(context, cur.file!, cur.cacheKey);
      case 'edit':
        _startEdit(cur);
      case 'pin':
        _togglePin(cur);
      case 'delete':
        _delete(cur);
      case 'report':
        _report(cur);
    }
  }

  /// Reaksiya: darhol (optimistik) ko'rsatiladi, keyin server javobi bilan almashtiriladi.
  Future<void> _react(String id, String emoji) async {
    final me = _me;
    final i = _messages.indexWhere((x) => x.id == id);
    if (me == null || i < 0) return;
    final before = _messages[i];
    HapticFeedback.selectionClick();
    setState(() => _upsert(before.toggledReaction(me.id, emoji)));
    try {
      final r = await _repo.react(id, emoji);
      if (mounted) setState(() => _upsert(r.withMine(_isMine(before))));
    } catch (e) {
      if (!mounted) return;
      setState(() => _upsert(before));
      showToast(context, e is ApiException ? e.message : "Reaksiya qöyib bölmadi", kind: ToastKind.error);
    }
  }

  Future<void> _togglePin(FamilyMessage m) async {
    var notify = false;
    if (!m.pinned) {
      final v = await showAppDialog<String>(
        context,
        builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, children: [
          const AppDialogIcon(TI.push_pin_rounded),
          const SizedBox(height: 16),
          Text('Xabarni qadaş',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textPrimary, fontSize: 19, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
          const SizedBox(height: 8),
          Text("Barça aʼzolarga bildirişnoma yuborilsinmi?",
              textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 14.5, height: 1.45)),
          const SizedBox(height: 22),
          AppDialogButton(label: 'Hammaga bildirib qadaş', onTap: () => Navigator.of(ctx).pop('notify')),
          const SizedBox(height: 10),
          AppDialogButton(label: 'Bildirişsiz qadaş', primary: false, onTap: () => Navigator.of(ctx).pop('silent')),
        ]),
      );
      if (v == null) return;
      notify = v == 'notify';
    }
    try {
      final r = await _repo.pin(m.id, pinned: !m.pinned, notify: notify);
      if (!mounted) return;
      setState(() => _upsert(r.withMine(_isMine(m))));
      showToast(context, r.pinned ? 'Qadaldi' : 'Qadaşdan olindi', kind: ToastKind.success);
    } on ApiException catch (e) {
      if (mounted) showToast(context, e.message, kind: ToastKind.error);
    } catch (_) {
      if (mounted) showToast(context, "Bajarib bölmadi", kind: ToastKind.error);
    }
  }

  Future<void> _delete(FamilyMessage m) async {
    final ok = await confirmDialog(
      context,
      title: "Öçirilsinmi?",
      message: m.scheduled ? "Rejalaştirilgan xabar bekor qilinadi." : "Xabar guruhdagi hamma uçun öçiriladi.",
      confirmLabel: "Ha, öçiriş",
      icon: TI.delete_outline_rounded,
    );
    if (ok != true) return;
    try {
      await _repo.delete(m.id);
      if (mounted) setState(() => _remove(m.id));
    } on ApiException catch (e) {
      if (mounted) showToast(context, e.message, kind: ToastKind.error);
    } catch (_) {
      if (mounted) showToast(context, "Öçirib bölmadi", kind: ToastKind.error);
    }
  }

  Future<void> _report(FamilyMessage m) async {
    final text = TextEditingController();
    await showAppSheet(
      context,
      title: 'Şikoyat qiliş',
      builder: (sheetContext) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Nima nojöya ekanini yozing (kamida 10 belgi). Şikoyat administratorga yuboriladi.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5, height: 1.4)),
        const SizedBox(height: 14),
        AppTextField(label: 'Şikoyat matni', controller: text, maxLines: 4),
        const SizedBox(height: 16),
        ListenableBuilder(
          listenable: text,
          builder: (_, __) => AppDialogButton(
            label: 'Yuboriş',
            danger: true,
            onTap: text.text.trim().length < 10
                ? null
                : () async {
                    Navigator.of(sheetContext).pop();
                    try {
                      await _repo.report(messageId: m.id, suspectId: m.author.isUser ? m.author.id : null, body: text.text.trim());
                      if (mounted) showToast(context, 'Şikoyat yuborildi', kind: ToastKind.success);
                    } catch (_) {
                      if (mounted) showToast(context, "Yuborib bölmadi", kind: ToastKind.error);
                    }
                  },
          ),
        ),
      ]),
    );
  }

  Future<void> _chooseIdentity() async {
    final me = _me;
    if (me == null) return;
    final v = await showAppSheet<String>(
      context,
      title: 'Kim nomidan yoziş',
      builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, children: [
        for (final a in me.identities)
          _IdentityRow(
            author: a,
            subtitle: switch (a.kind) {
              'brand' => 'Anonim — hamma «Tayyorr.uz» deb köradi',
              'support' => 'Qöllab-quvvatlaş xizmati nomidan',
              _ => 'Öz profilingizdan',
            },
            selected: _asOf(a) == _as,
            onTap: () => Navigator.of(ctx).pop(_asOf(a)),
          ),
      ]),
    );
    if (v != null && mounted) setState(() => _as = v);
  }

  static String _asOf(FamilyAuthor a) => a.kind == 'user' ? 'self' : a.kind;

  FamilyAuthor? get _identity {
    final me = _me;
    if (me == null) return null;
    for (final a in me.identities) {
      if (_asOf(a) == _as) return a;
    }
    return me.identities.isEmpty ? null : me.identities.first;
  }

  Future<void> _showScheduled() async {
    await showAppSheet(
      context,
      title: 'Rejalaştirilgan xabarlar',
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (_scheduled.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text('Rejalaştirilgan xabar yöq', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
            ),
          for (final m in List.of(_scheduled))
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
              decoration: BoxDecoration(
                color: AppColors.tint(0.05),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Row(children: [
                TIcon(TI.schedule_rounded, size: 18, color: WebC.indigoSoft),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(shortDateTime(m.sendAt), style: TextStyle(color: WebC.indigoSoft, fontSize: 12, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(m.preview, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
                  ]),
                ),
                IconButton(
                  onPressed: () async {
                    try {
                      await _repo.delete(m.id);
                      if (!mounted) return;
                      setState(() => _remove(m.id));
                      setSheet(() {});
                    } catch (_) {
                      if (mounted) showToast(context, "Bekor qilib bölmadi", kind: ToastKind.error);
                    }
                  },
                  icon: const TIcon(TI.delete_outline_rounded, size: 20, color: Color(0xFFF43F5E)),
                ),
              ]),
            ),
        ]),
      ),
    );
  }

  // ───────────────────────── ko'rinish ─────────────────────────

  @override
  Widget build(BuildContext context) {
    final pinned = _pinned.isEmpty ? null : _pinned[_pinIndex % _pinned.length];
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Column(children: [
            _Header(onBack: () => Navigator.of(context).maybePop(), members: _members, online: _online),
            if (pinned != null)
              _PinnedBar(
                message: pinned,
                index: _pinIndex % _pinned.length,
                total: _pinned.length,
                onTap: () {
                  _jumpTo(pinned.id);
                  if (_pinned.length > 1) setState(() => _pinIndex = (_pinIndex + 1) % _pinned.length);
                },
              ),
            Expanded(child: _body()),
            if (_suggest.isNotEmpty) _SuggestPanel(items: _suggest, onPick: _insertMention),
            if (_scheduled.isNotEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: GestureDetector(
                  onTap: _showScheduled,
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(12, 0, 12, 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: WebC.indigoFill,
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.4)),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      TIcon(TI.schedule_rounded, size: 15, color: WebC.indigoSoft),
                      const SizedBox(width: 6),
                      Text('Rejalaştirilgan: ${_scheduled.length} · ${shortDateTime(_scheduled.first.sendAt)}',
                          style: TextStyle(color: WebC.indigoSoft, fontSize: 12.5, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                ),
              ),
            if (_editing != null)
              _ReplyBanner(message: _editing!, editing: true, onClose: _cancelEdit, onTap: () => _jumpTo(_editing!.id))
            else if (_replyTo != null)
              _ReplyBanner(message: _replyTo!, onClose: () => setState(() => _replyTo = null), onTap: () => _jumpTo(_replyTo!.id)),
            if (_pending != null) PendingAttachmentBar(pending: _pending!, onCancel: _cancelPending),
            // kirishi bilanoq yozish mumkin (ma'lumot yuklanishini kutmaydi)
            ChatComposer(
                controller: _text,
                focusNode: _focus,
                onSend: () => _send(),
                onSendLongPress: _sendMenu,
                onAttach: _editing != null ? null : _pickFile,
                onRecorded: _onRecorded,
                hasAttachment: _pending != null,
                attachmentReady: _pending?.ready ?? false,
                leading: _isAdmin && _identity != null
                    ? GestureDetector(
                        onTap: _chooseIdentity,
                        child: Container(
                          width: 42,
                          height: 42,
                          padding: const EdgeInsets.all(3),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: _as == 'self' ? null : const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]),
                            border: _as == 'self' ? Border.all(color: WebC.border) : null,
                          ),
                          child: UserAvatar(imageUrl: _identity!.image, initial: _identity!.initial, size: 36),
                        ),
                      )
                    : null,
              ),
          ]),
        ),
      ),
    );
  }

  Widget _body() {
    if (_loading && _messages.isEmpty) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
          _SkelRow(widthFraction: 0.45),
          SizedBox(height: 12),
          _SkelRow(widthFraction: 0.6),
          SizedBox(height: 12),
          SBubble(widthFraction: 0.45, mine: true),
          SizedBox(height: 12),
          _SkelRow(widthFraction: 0.35),
          SizedBox(height: 12),
          _SkelRow(widthFraction: 0.55),
        ]),
      );
    }
    if (_error != null && _messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 14),
            WebButton(label: 'Qayta urinib köriş', small: true, onPressed: () {
              setState(() => _loading = true);
              _load(initial: true);
            }),
          ]),
        ),
      );
    }
    if (_messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const FamilyMark(size: 56),
            const SizedBox(height: 16),
            Text('Hali xabar yöq', style: TextStyle(color: WebC.white, fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text('Birinçi bölib salom yozing — guruhdagi hamma köradi 👋',
                textAlign: TextAlign.center, style: TextStyle(color: WebC.zinc500, fontSize: 14, height: 1.4)),
          ]),
        ),
      );
    }
    final count = _messages.length + (_hasMore ? 1 : 0);
    return Stack(children: [
      ListView.builder(
        key: _listKey,
        controller: _scroll,
        reverse: true,
        padding: const EdgeInsets.fromLTRB(10, 12, 12, 12),
        itemCount: count,
        itemBuilder: (context, i) {
          if (i >= _messages.length) {
            // eskilari yuklanmoqda
            return const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: _SkelRow(widthFraction: 0.5));
          }
          final idx = _messages.length - 1 - i;
          final m = _messages[idx];
          final mine = _isMine(m);
          final f = _flags(idx);
          final k = m.stableKey;
          return Column(
            key: _keyFor(k),
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (f.newDay) _DayChip(date: m.sendAt),
              ChatAppear(
                animate: _fresh.contains(k),
                fromRight: mine,
                child: SwipeToReply(
                  enabled: !m.isLocal,
                  onReply: () => _setReply(m),
                  child: FlashHighlight(
                    flashKey: _flashId == k ? _flashTick : null,
                    child: _bubble(m, mine, f, bubbleKey: _bubbleKeys.putIfAbsent(k, GlobalKey.new)),
                  ),
                ),
              ),
            ],
          );
        },
      ),
      Positioned(
        right: 14,
        bottom: 12,
        child: ChatScrollButtons(controller: _scroll, mentionCount: _mentionQueue.length, onMention: _nextMention),
      ),
    ]);
  }

  /// Ketma-ket xabarlar guruhlanishi: ism (birinchisida), avatar (oxirgisida), kun ajratgichi.
  ({bool showName, bool showAvatar, bool tight, bool newDay}) _flags(int idx) {
    final m = _messages[idx];
    final prev = idx > 0 ? _messages[idx - 1] : null;
    final next = idx < _messages.length - 1 ? _messages[idx + 1] : null;
    final mine = _isMine(m);
    bool same(FamilyMessage? o) =>
        o != null && o.author.kind == m.author.kind && o.author.id == m.author.id && o.sendAt.difference(m.sendAt).inMinutes.abs() < 10;
    final newDay = prev == null || !_sameDay(prev.sendAt, m.sendAt);
    return (showName: !mine && (newDay || !same(prev)), showAvatar: !mine && !same(next), tight: same(next), newDay: newDay);
  }

  Widget _bubble(FamilyMessage m, bool mine, ({bool showName, bool showAvatar, bool tight, bool newDay}) f,
      {GlobalKey? bubbleKey, bool previewOnly = false}) {
    final me = _me;
    return _FamilyBubble(
      message: m,
      mine: mine,
      showName: f.showName,
      showAvatar: f.showAvatar,
      tight: f.tight,
      mentioned: !mine && me != null && m.mentionsMe(me.id, me.isAdmin),
      meId: me?.id,
      bubbleKey: bubbleKey,
      previewOnly: previewOnly,
      onTap: () => _openPopup(m),
      onAuthorTap: () => _openProfile(m.author),
      onMentionTap: _openProfileByMention,
      onReact: (e) => m.isLocal ? null : _react(m.id, e),
      onReactLong: (e) => showFamilyPeople(context, m.id, reactions: true, emoji: e),
      onReplyTap: m.replyTo == null ? null : () => _jumpTo(m.replyTo!.id),
      showBy: _isAdmin,
      onRetry: m.status == FamilySendStatus.failed ? () => _deliver(m.clientId!) : null,
      onDiscard: m.status == FamilySendStatus.failed ? () => _discardLocal(m) : null,
    );
  }

  static bool _sameDay(DateTime a, DateTime b) {
    final x = a.toLocal(), y = b.toLocal();
    return x.year == y.year && x.month == y.month && x.day == y.day;
  }
}

// ───────────────────────── vidjetlar ─────────────────────────

class _Header extends StatelessWidget {
  const _Header({required this.onBack, this.members, this.online});
  final VoidCallback onBack;
  final int? members;
  final int? online;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 10, 12, 10),
      decoration: BoxDecoration(color: WebC.headerBar, border: Border(bottom: BorderSide(color: WebC.border))),
      child: Row(children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onBack,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            child: TIcon(TI.arrow_back_ios_new_rounded, size: 20, color: WebC.zinc400),
          ),
        ),
        const SizedBox(width: 4),
        const FamilyMark(size: 36),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(kFamilyName, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            if (members == null)
              Text('Umumiy guruh · barça aʼzolar', style: TextStyle(color: WebC.zinc500, fontSize: 12))
            else
              Row(children: [
                Text('$members aʼzo', style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                if ((online ?? 0) > 0) ...[
                  Text(' · ', style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                  Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: WebC.emerald)),
                  const SizedBox(width: 4),
                  Text('$online onlayn', style: TextStyle(color: WebC.emerald, fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ]),
          ]),
        ),
      ]),
    );
  }
}

class _PinnedBar extends StatelessWidget {
  const _PinnedBar({required this.message, required this.index, required this.total, required this.onTap});
  final FamilyMessage message;
  final int index;
  final int total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: AppColors.indigo.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.indigo.withValues(alpha: 0.3)),
        ),
        child: Row(children: [
          Container(width: 3, height: 32, decoration: BoxDecoration(color: AppColors.indigo, borderRadius: BorderRadius.circular(9))),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(
                total > 1 ? 'Qadalgan xabar ${index + 1}/$total' : 'Qadalgan xabar',
                style: const TextStyle(color: AppColors.indigo, fontSize: 11.5, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 1),
              Text(message.preview, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppColors.textPrimary, fontSize: 13)),
            ]),
          ),
          const SizedBox(width: 8),
          const TIcon(TI.push_pin_rounded, size: 17, color: AppColors.indigo),
        ]),
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  const _DayChip({required this.date});
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final d = date.toLocal();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(d.year, d.month, d.day);
    final label = day == today
        ? 'Bugun'
        : day == today.subtract(const Duration(days: 1))
            ? 'Keça'
            : shortDate(d);
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(color: WebC.fill10, borderRadius: BorderRadius.circular(99)),
        child: Text(label, style: TextStyle(color: WebC.zinc400, fontSize: 11.5, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

/// Muallif ismi rangi — har odamga o'z rangi (Telegramdagidek).
Color _nameColor(FamilyAuthor a) {
  if (a.kind == 'brand') return const Color(0xFFA78BFA);
  if (a.kind == 'support') return const Color(0xFF34D399);
  const palette = [Color(0xFF60A5FA), Color(0xFFF472B6), Color(0xFFFBBF24), Color(0xFF34D399), Color(0xFFA78BFA), Color(0xFFF87171), Color(0xFF22D3EE)];
  final c = palette[a.id.hashCode.abs() % palette.length];
  return AppColors.isLight ? Color.lerp(c, Colors.black, 0.25)! : c;
}

class _FamilyBubble extends StatelessWidget {
  const _FamilyBubble({
    required this.message,
    required this.mine,
    required this.showName,
    required this.showAvatar,
    required this.tight,
    required this.mentioned,
    required this.meId,
    required this.onTap,
    required this.onAuthorTap,
    required this.onMentionTap,
    required this.onReact,
    required this.onReactLong,
    this.onReplyTap,
    this.bubbleKey,
    this.previewOnly = false,
    this.showBy = false,
    this.onRetry,
    this.onDiscard,
  });

  /// Admin: Tayyorr.uz / Support nomidagi xabarda haqiqiy muallif qatori.
  final bool showBy;

  /// Yuborilmagan (qizil) xabar uchun.
  final VoidCallback? onRetry;
  final VoidCallback? onDiscard;
  final FamilyMessage message;
  final bool mine;
  final bool showName;
  final bool showAvatar;
  final bool tight;
  final bool mentioned;
  final String? meId;

  /// Bitta bosish — amallar popupi.
  final VoidCallback onTap;
  final VoidCallback onAuthorTap;
  final void Function(FamilyMention) onMentionTap;
  final void Function(String emoji)? onReact;
  final void Function(String emoji) onReactLong;
  final VoidCallback? onReplyTap;

  /// Popupda xabarni o'z joyida ko'rsatish uchun — pufakchaning o'lchami/joyi.
  final GlobalKey? bubbleKey;

  /// Faqat pufakchaning o'zi (popup ichidagi nusxa).
  final bool previewOnly;

  @override
  Widget build(BuildContext context) {
    final m = message;
    final a = m.author;
    final textColor = mine ? Colors.white : WebC.zinc200;
    final timeColor = mine ? const Color(0xFFC7D2FE) : WebC.zinc500;
    final bubble = GestureDetector(
      key: bubbleKey,
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      onLongPress: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
        decoration: BoxDecoration(
          color: mine
              ? const Color(0xFF4F39F6)
              : mentioned
                  ? Color.alphaBlend(const Color(0xFFF59E0B).withValues(alpha: 0.10), AppColors.isLight ? Colors.white : const Color(0xFF15151D))
                  : (previewOnly ? (AppColors.isLight ? Colors.white : const Color(0xFF1B1B25)) : WebC.fill5),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(!mine && showAvatar ? 5 : 16),
            bottomRight: Radius.circular(mine && !tight ? 5 : 16),
          ),
          border: m.status == FamilySendStatus.failed
              ? Border.all(color: const Color(0xFFF43F5E), width: 1.5)
              : mine
                  ? null
                  : Border.all(color: mentioned ? const Color(0xFFF59E0B).withValues(alpha: 0.45) : WebC.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          if (showName)
            GestureDetector(
              onTap: a.isUser ? onAuthorTap : null,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Flexible(
                    child: Text(a.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: _nameColor(a), fontSize: 13, fontWeight: FontWeight.w700)),
                  ),
                  if (a.isOfficial) ...[
                    const SizedBox(width: 4),
                    TIcon(TI.verified_user_rounded, size: 13, color: _nameColor(a)),
                  ],
                ]),
              ),
            ),
          if (m.replyTo != null)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onReplyTap,
              child: Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.fromLTRB(8, 3, 6, 3),
                decoration: BoxDecoration(
                  color: mine ? Colors.white.withValues(alpha: 0.12) : AppColors.indigo.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border(left: BorderSide(color: mine ? const Color(0xFFA5B4FC) : WebC.indigo, width: 2.5)),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(m.replyTo!.authorName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: mine ? Colors.white : WebC.indigoSoft, fontSize: 12, fontWeight: FontWeight.w700)),
                  Text(m.replyTo!.deleted ? 'öçirilgan xabar' : m.replyTo!.text,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: mine ? const Color(0xFFC7D2FE) : WebC.zinc400, fontSize: 12)),
                ]),
              ),
            ),
          if (m.file != null) ChatAttachment(file: m.file!, cacheKey: m.cacheKey, mine: mine),
          if (m.expiredFile != null) _ExpiredFile(file: m.expiredFile!, mine: mine),
          if (m.body.isNotEmpty) ...[
            if (m.file != null || m.expiredFile != null) const SizedBox(height: 6),
            _MentionText(
              text: m.body,
              mentions: m.mentions,
              style: TextStyle(color: textColor, fontSize: 14, height: 1.45),
              mentionColor: mine ? Colors.white : WebC.indigoSoft,
              onMentionTap: onMentionTap,
            ),
          ],
          // admin: kim nomidan va aslida kim yozgan
          if (showBy && m.by != null && a.isOfficial) ...[
            const SizedBox(height: 4),
            Text(
              '${a.name} nomidan · ${m.by!.login != null ? '@${m.by!.login}' : m.by!.name} yozdi',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: timeColor, fontSize: 10.5, fontStyle: FontStyle.italic),
            ),
          ],
          const SizedBox(height: 2),
          Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            if (m.notifyAll) ...[TIcon(TI.campaign_rounded, size: 12, color: timeColor), const SizedBox(width: 4)],
            if (m.pinned) ...[TIcon(TI.push_pin_rounded, size: 12, color: timeColor), const SizedBox(width: 4)],
            Text('${m.edited ? 'tahrirlangan · ' : ''}${_hm(m.sendAt)}', style: TextStyle(color: timeColor, fontSize: 10)),
            // meniki: soat — yuborilmoqda, ! — yuborilmadi, ✓ — yuborildi, ✓✓ — kimdir ko'rdi
            if (mine) ...[
              const SizedBox(width: 3),
              if (m.status == FamilySendStatus.pending)
                TIcon(TI.schedule_rounded, size: 13, color: timeColor)
              else if (m.status == FamilySendStatus.failed)
                const TIcon(TI.error_outline_rounded, size: 13, color: Color(0xFFFDA4AF))
              else
                TIcon(
                  m.seen > 0 ? TI.done_all_rounded : TI.done_rounded,
                  size: 14,
                  color: m.seen > 0 ? const Color(0xFF7DD3FC) : timeColor,
                ),
            ],
          ]),
        ]),
      ),
    );

    if (previewOnly) return bubble;

    return Padding(
      padding: EdgeInsets.only(top: showName ? 6 : 2, bottom: tight ? 0 : 2),
      child: LayoutBuilder(
        builder: (context, c) => Column(
          crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (!mine) ...[
                  SizedBox(
                    width: 34,
                    child: showAvatar
                        ? UserAvatar(imageUrl: a.image, initial: a.initial, size: 34, onTap: a.isUser ? onAuthorTap : null)
                        : null,
                  ),
                  const SizedBox(width: 8),
                ],
                ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: c.maxWidth * (mine ? 0.82 : 0.8) - (mine ? 0 : 42)),
                  child: IntrinsicWidth(child: bubble),
                ),
              ],
            ),
            if (m.reactions.isNotEmpty)
              Padding(
                padding: EdgeInsets.only(top: 5, left: mine ? 0 : 42),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: c.maxWidth * 0.86),
                  child: FamilyReactionChips(message: m, meId: meId, alignRight: mine, onTap: (e) => onReact?.call(e), onLongPress: onReactLong),
                ),
              ),
            if (onRetry != null || onDiscard != null)
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const TIcon(TI.error_outline_rounded, size: 14, color: Color(0xFFF43F5E)),
                  const SizedBox(width: 4),
                  const Text('Yuborilmadi', style: TextStyle(color: Color(0xFFF43F5E), fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(width: 10),
                  _MiniButton(label: 'Qayta yuboriş', icon: TI.refresh_rounded, onTap: onRetry),
                  const SizedBox(width: 6),
                  _MiniButton(label: 'Öçiriş', icon: TI.delete_outline_rounded, onTap: onDiscard, danger: true),
                ]),
              ),
          ],
        ),
      ),
    );
  }

  static String _hm(DateTime d) {
    final t = d.toLocal();
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }
}

class _ExpiredFile extends StatelessWidget {
  const _ExpiredFile({required this.file, required this.mine});
  final ChatFileModel file;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final c = mine ? Colors.white : WebC.zinc300;
    return Container(
      width: ChatAttachment.width,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: mine ? Colors.white.withValues(alpha: 0.12) : WebC.fill5,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: mine ? Colors.white24 : WebC.border),
      ),
      child: Row(children: [
        Container(
          width: 38,
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: mine ? Colors.white.withValues(alpha: 0.15) : WebC.fill10, borderRadius: BorderRadius.circular(10)),
          child: TIcon(TI.hourglass_empty_rounded, size: 19, color: c),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(file.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: c, fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text('Fayl muddati tugagan (5 kun)', style: TextStyle(color: mine ? const Color(0xFFC7D2FE) : WebC.zinc500, fontSize: 11.5)),
          ]),
        ),
      ]),
    );
  }
}

/// Matn: @login'lar ajratib ko'rsatiladi va bosilsa — profil; belgilash bo'lmasa — havolalar bilan oddiy matn.
class _MentionText extends StatefulWidget {
  const _MentionText({required this.text, required this.mentions, required this.style, required this.mentionColor, required this.onMentionTap});
  final String text;
  final List<FamilyMention> mentions;
  final TextStyle style;
  final Color mentionColor;
  final void Function(FamilyMention) onMentionTap;

  @override
  State<_MentionText> createState() => _MentionTextState();
}

class _MentionTextState extends State<_MentionText> {
  final _recognizers = <TapGestureRecognizer>[];

  void _clear() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.mentions.isEmpty) {
      return LinkText(widget.text, style: widget.style, linkColor: widget.mentionColor);
    }
    _clear();
    final byLogin = {for (final m in widget.mentions) m.login.toLowerCase(): m};
    final spans = <InlineSpan>[];
    var last = 0;
    for (final match in RegExp(r'@([A-Za-z0-9_.]{2,40})').allMatches(widget.text)) {
      final login = match.group(1)!.replaceAll(RegExp(r'\.+$'), '');
      final mention = byLogin[login.toLowerCase()];
      if (mention == null) continue;
      if (match.start > last) spans.add(TextSpan(text: widget.text.substring(last, match.start)));
      final end = match.start + 1 + login.length;
      final r = TapGestureRecognizer()..onTap = () => widget.onMentionTap(mention);
      _recognizers.add(r);
      spans.add(TextSpan(
        text: widget.text.substring(match.start, end),
        style: TextStyle(color: widget.mentionColor, fontWeight: FontWeight.w700),
        recognizer: r,
      ));
      last = end;
    }
    if (last < widget.text.length) spans.add(TextSpan(text: widget.text.substring(last)));
    return Text.rich(TextSpan(style: widget.style, children: spans));
  }
}

class _SuggestPanel extends StatelessWidget {
  const _SuggestPanel({required this.items, required this.onPick});
  final List<FamilyAuthor> items;
  final void Function(FamilyAuthor) onPick;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(10, 0, 10, 6),
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.isLight ? Colors.white : const Color(0xFF14141E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WebC.border),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: AppColors.isLight ? 0.08 : 0.35), blurRadius: 18, offset: const Offset(0, 6))],
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        for (final a in items)
          InkWell(
            onTap: () => onPick(a),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              child: Row(children: [
                UserAvatar(imageUrl: a.image, initial: a.initial, size: 32),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Flexible(
                        child: Text(a.name,
                            maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w600)),
                      ),
                      if (a.isOfficial) ...[const SizedBox(width: 4), TIcon(TI.verified_user_rounded, size: 13, color: _nameColor(a))],
                    ]),
                    if (a.login != null) Text('@${a.login}', style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                  ]),
                ),
              ]),
            ),
          ),
      ]),
    );
  }
}

class _IdentityRow extends StatelessWidget {
  const _IdentityRow({required this.author, required this.subtitle, required this.selected, required this.onTap});
  final FamilyAuthor author;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? AppColors.indigo.withValues(alpha: 0.12) : AppColors.tint(0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? AppColors.indigo.withValues(alpha: 0.5) : AppColors.cardBorder),
        ),
        child: Row(children: [
          UserAvatar(imageUrl: author.image, initial: author.initial, size: 42),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(author.name, style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(subtitle, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
            ]),
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: selected ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]) : null,
              border: selected ? null : Border.all(color: AppColors.tint(0.25), width: 1.6),
            ),
            child: selected ? const TIcon(TI.check_rounded, size: 14, color: Colors.white) : null,
          ),
        ]),
      ),
    );
  }
}

class _ReplyBanner extends StatelessWidget {
  const _ReplyBanner({required this.message, required this.onClose, required this.onTap, this.editing = false});
  final bool editing;
  final FamilyMessage message;
  final VoidCallback onClose;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.tint(0.05),
          borderRadius: BorderRadius.circular(12),
          border: const Border(left: BorderSide(color: AppColors.indigo, width: 3)),
        ),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(editing ? 'Tahrirlanmoqda' : '${message.author.name} — javob',
                  maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.indigo, fontSize: 11.5, fontWeight: FontWeight.w700)),
              Text(message.preview, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
            ]),
          ),
          IconButton(
            onPressed: onClose,
            icon: TIcon(TI.close_rounded, size: 18, color: AppColors.textFaint),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ]),
      ),
    );
  }
}

/// Skelet: avatar + pufakcha (boshqalarning xabari).
class _SkelRow extends StatelessWidget {
  const _SkelRow({required this.widthFraction});
  final double widthFraction;

  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      const SCircle(size: 34),
      const SizedBox(width: 8),
      SBar(width: MediaQuery.sizeOf(context).width * widthFraction, height: 46, borderRadius: 16),
    ]);
  }
}

/// Optimistik yuborilgan xabar ma'lumoti (qayta yuborish uchun).
class _Outgoing {
  const _Outgoing({required this.body, this.replyToId, required this.as, required this.notifyAll, this.file});
  final String body;
  final String? replyToId;
  final String as;
  final bool notifyAll;
  final Map<String, Object>? file;
}

class _MiniButton extends StatelessWidget {
  const _MiniButton({required this.label, required this.icon, this.onTap, this.danger = false});
  final String label;
  final TIData icon;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final c = danger ? const Color(0xFFF43F5E) : WebC.indigoSoft;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: c.withValues(alpha: 0.4)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          TIcon(icon, size: 13, color: c),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
