import 'dart:async';
import 'dart:typed_data';

import 'package:equatable/equatable.dart';
import 'package:flutter/widgets.dart' show AppLifecycleState, WidgetsBinding;
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/notifications/message_notifier.dart';
import '../../../core/realtime/realtime_service.dart';
import '../data/message_model.dart';
import '../data/messages_repository.dart';

enum ChatStatus { initial, loading, success, failure }

class ChatState extends Equatable {
  const ChatState({
    this.status = ChatStatus.initial,
    this.other,
    this.messages = const [],
    this.error,
    this.sending = false,
    this.blockedMe = false,
    this.blockedByMe = false,
    this.activeContracts = const [],
    this.replyTo,
  });

  final ChatStatus status;
  final ChatOtherUser? other;
  final List<ChatMessageModel> messages;
  final String? error;
  final bool sending;
  final bool blockedMe;
  final bool blockedByMe;
  final List<ChatContractOrderRef> activeContracts;
  final ChatMessageModel? replyTo;

  ChatState copyWith({
    ChatStatus? status,
    ChatOtherUser? other,
    List<ChatMessageModel>? messages,
    String? error,
    bool? sending,
    bool? blockedMe,
    bool? blockedByMe,
    List<ChatContractOrderRef>? activeContracts,
    ChatMessageModel? replyTo,
    bool clearReply = false,
  }) {
    return ChatState(
      status: status ?? this.status,
      other: other ?? this.other,
      messages: messages ?? this.messages,
      error: error,
      sending: sending ?? this.sending,
      blockedMe: blockedMe ?? this.blockedMe,
      blockedByMe: blockedByMe ?? this.blockedByMe,
      activeContracts: activeContracts ?? this.activeContracts,
      replyTo: clearReply ? null : (replyTo ?? this.replyTo),
    );
  }

  @override
  // `messages` — ro'yxatning o'zi: reaksiya/tahrirda soni o'zgarmasa ham
  // yangi ro'yxat emit qilinadi va ekran darhol yangilanadi.
  List<Object?> get props => [
    status,
    other,
    messages,
    error,
    sending,
    blockedMe,
    blockedByMe,
    activeContracts,
    replyTo?.id,
  ];
}

class ChatCubit extends Cubit<ChatState> with SafeEmit<ChatState> {
  ChatCubit(this._repo, this.conversationId)
    // xotiradagi kesh — suhbatga qayta kirganda xabarlar darhol (shimmersiz)
    : super(
        _cache[conversationId]?.copyWith(status: ChatStatus.success) ??
            const ChatState(),
      );

  /// Suhbatlar keshi (faqat ilova ishlab turgan paytda) — faqat yuborilgan xabarlar.
  static final _cache = <String, ChatState>{};

  final MessagesRepository _repo;
  final String conversationId;
  Timer? _pollTimer;

  /// Optimistik yuborilayotganlar: clientId → ma'lumot (qayta yuborish uchun).
  final _outbox =
      <
        String,
        ({String? body, String? replyToId, Map<String, Object>? file})
      >{};

  @override
  void onChange(Change<ChatState> change) {
    super.onChange(change);
    final n = change.nextState;
    if (n.status == ChatStatus.success) {
      _cache[conversationId] = n.copyWith(
        messages: n.messages.where((m) => !m.isLocal).toList(),
        clearReply: true,
      );
    }
  }

  /// Serverdan kelganlarni birlashtirish: mavjudi o'z joyida almashadi (clientId — kalit — saqlanadi),
  /// optimistik xabarning server nusxasi (POST javobidan oldin kelgan) dublikat bo'lmaydi.
  List<ChatMessageModel> _merge(List<ChatMessageModel> incoming) {
    final list = List.of(state.messages);
    for (final m in incoming) {
      var i = list.indexWhere((x) => x.id == m.id);
      if (i < 0 && m.mine) {
        i = list.indexWhere(
          (x) =>
              x.status == ChatSendStatus.pending &&
              x.body == m.body &&
              x.file?.name == m.file?.name,
        );
        if (i >= 0) _outbox.remove(list[i].clientId);
      }
      if (i >= 0) {
        list[i] = m.copyWith(
          clientId: list[i].clientId,
          status: ChatSendStatus.sent,
        );
      } else {
        list.add(m);
      }
    }
    // yuborilayotganlar — oxirida
    list.sort(
      (a, b) => a.isLocal == b.isLocal
          ? a.createdAt.compareTo(b.createdAt)
          : (a.isLocal ? 1 : -1),
    );
    return list;
  }

  Future<void> load() async {
    final cached = state.messages.isNotEmpty;
    if (!cached) emit(state.copyWith(status: ChatStatus.loading));
    try {
      final data = await _repo.fetchConversation(conversationId);
      emit(
        state.copyWith(
          status: ChatStatus.success,
          other: data.other,
          messages: cached ? _merge(data.messages) : data.messages,
          blockedMe: data.blockedMe,
          blockedByMe: data.blockedByMe,
          activeContracts: data.activeContracts,
        ),
      );
      unawaited(_repo.markRead(conversationId).catchError((_) {}));
      _startPolling();
    } catch (e) {
      if (cached) {
        _startPolling();
      } else {
        emit(
          state.copyWith(status: ChatStatus.failure, error: friendlyError(e)),
        );
      }
    }
  }

  StreamSubscription<RealtimeEvent>? _rtSub;
  DateTime _lastPoll = DateTime.now();
  bool _polling = false;

  /// Real-time ulangan bo'lsa — xabar signal bilan darhol keladi, ehtiyot so'rovi daqiqada bir;
  /// ulanmagan bo'lsa — avvalgidek 4 soniyada bir. Ilova fonda bo'lsa — so'ralmaydi.
  void _startPolling() {
    _pollTimer?.cancel();
    _rtSub?.cancel();
    _lastPoll = DateTime.now();
    _rtSub = RealtimeService.instance.events.listen((e) {
      if (e.name == 'chat' &&
          (e.data['c'] == null || e.data['c'] == conversationId)) {
        _poll();
      }
    });
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      final state = WidgetsBinding.instance.lifecycleState;
      if (state != null && state != AppLifecycleState.resumed) return;
      final every = RealtimeService.instance.connected.value
          ? RealtimeService.safetyPoll
          : const Duration(seconds: 4);
      if (DateTime.now().difference(_lastPoll) >= every) _poll();
    });
  }

  Future<void> _poll() async {
    if (_polling) return;
    _polling = true;
    _lastPoll = DateTime.now();
    try {
      await _pollOnce();
    } finally {
      _polling = false;
    }
  }

  Future<void> _pollOnce() async {
    try {
      final sent = state.messages.where((m) => !m.isLocal);
      final since = sent.isEmpty
          ? null
          : sent.map((m) => m.updatedAt).reduce((a, b) => a > b ? a : b);
      final data = await _repo.fetchConversation(conversationId, since: since);
      final known = state.messages.map((m) => m.id).toSet();
      // boshqa tomondan yangi xabar keldi — Telegramdagidek qisqa "tin"
      if (data.messages.any(
        (m) => !m.mine && !m.system && !known.contains(m.id),
      )) {
        MessageNotifier.instance.playTin();
      }
      emit(
        state.copyWith(
          messages: _merge(data.messages),
          blockedMe: data.blockedMe,
          blockedByMe: data.blockedByMe,
          activeContracts: data.activeContracts,
        ),
      );
      if (data.messages.any((m) => !m.mine)) {
        unawaited(_repo.markRead(conversationId).catchError((_) {}));
      }
    } catch (_) {
      // jim — poyga vaqtida internet uzilib qolishi mumkin
    }
  }

  void setReplyTo(ChatMessageModel? message) {
    if (message == null) {
      emit(state.copyWith(clearReply: true));
    } else {
      emit(state.copyWith(replyTo: message));
    }
  }

  /// Optimistik yuborish: xabar darhol ro'yxatda (soat belgisi bilan), server javobi kelganda o'z joyida
  /// almashadi. [file] — oldindan yuklangan fayl, [fileModel] — mahalliy ko'rinishi (kesh kaliti — clientId).
  Future<void> sendOptimistic({
    required String clientId,
    String? body,
    Map<String, Object>? file,
    ChatFileModel? fileModel,
  }) async {
    final text = body?.trim() ?? '';
    if (text.isEmpty && file == null) return;
    final reply = state.replyTo;
    final now = DateTime.now().millisecondsSinceEpoch;
    final local = ChatMessageModel(
      id: 'local:$clientId',
      senderId: '',
      body: text,
      system: false,
      createdAt: now,
      updatedAt: 0,
      mine: true,
      edited: false,
      deleted: false,
      replyTo: reply == null
          ? null
          : ReplyPreviewModel(
              id: reply.id,
              authorId: reply.senderId,
              text: reply.body.isNotEmpty
                  ? reply.body
                  : (reply.file?.name ?? 'xabar'),
              deleted: reply.deleted,
            ),
      file: fileModel,
      clientId: clientId,
      status: ChatSendStatus.pending,
    );
    _outbox[clientId] = (
      body: text.isEmpty ? null : text,
      replyToId: reply?.id,
      file: file,
    );
    emit(
      state.copyWith(
        messages: [...state.messages, local],
        clearReply: true,
        error: null,
      ),
    );
    await _enqueue(clientId);
  }

  /// Yuboriş navbati — xabarlar yozilgan tartibda, bittadan ketadi (parallel yuborilsa server
  /// ularni qaysi biri oldin yetib kelsa şu tartibda saqlaydi va ketma-ketlik aralaşib ketadi).
  Future<void> _sendChain = Future.value();

  Future<void> _enqueue(String clientId) {
    final next = _sendChain.then((_) => _deliver(clientId)).catchError((_) {});
    _sendChain = next;
    return next;
  }

  Future<void> _deliver(String clientId) async {
    final o = _outbox[clientId];
    if (o == null) return;
    _setStatus(clientId, ChatSendStatus.pending);
    try {
      final msg = await _repo.sendMessage(
        conversationId,
        body: o.body,
        replyToId: o.replyToId,
        file: o.file,
      );
      _outbox.remove(clientId);
      MessageNotifier.instance.playSent();
      final list = List.of(state.messages);
      var i = list.indexWhere((x) => x.clientId == clientId);
      if (i < 0) i = list.indexWhere((x) => x.id == msg.id);
      if (i >= 0) {
        list[i] = msg.copyWith(
          clientId: list[i].clientId ?? clientId,
          status: ChatSendStatus.sent,
        );
      } else {
        list.add(msg.copyWith(clientId: clientId));
      }
      emit(state.copyWith(messages: list));
    } on ApiException catch (e) {
      // so'rov paytida xabar boshqa yo'l bilan (so'rab turish) yetib kelgan bo'lsa — xato emas
      if (state.messages.any((x) => x.clientId == clientId && !x.isLocal)) {
        return;
      }
      if (e.restricted) {
        // cheklangan — qayta yuborishning ma'nosi yo'q: xabar olib tashlanadi, sababi ko'rsatiladi
        discard(clientId);
        emit(state.copyWith(error: friendlyError(e)));
        return;
      }
      _setStatus(clientId, ChatSendStatus.failed);
      emit(state.copyWith(error: friendlyError(e)));
    } catch (_) {
      if (state.messages.any((x) => x.clientId == clientId && !x.isLocal)) {
        return;
      }
      _setStatus(clientId, ChatSendStatus.failed);
    }
  }

  void _setStatus(String clientId, ChatSendStatus st) {
    emit(
      state.copyWith(
        messages: [
          for (final m in state.messages)
            if (m.clientId == clientId && m.isLocal)
              m.copyWith(status: st)
            else
              m,
        ],
      ),
    );
  }

  Future<void> retry(String clientId) => _deliver(clientId);

  void discard(String clientId) {
    _outbox.remove(clientId);
    emit(
      state.copyWith(
        messages: state.messages
            .where((m) => !(m.clientId == clientId && m.isLocal))
            .toList(),
      ),
    );
  }

  /// Eski usul (matn) — endi optimistik.
  Future<void> send(String body) => sendOptimistic(
    clientId: 'c${DateTime.now().microsecondsSinceEpoch}',
    body: body,
  );

  Future<void> sendFile({
    required Uint8List bytes,
    required String filename,
    required String contentType,
  }) async {
    final replyId = state.replyTo?.id;
    emit(state.copyWith(sending: true, error: null, clearReply: true));
    try {
      final msg = await _repo.sendFile(
        conversationId,
        bytes: bytes,
        filename: filename,
        contentType: contentType,
        replyToId: replyId,
      );
      emit(state.copyWith(sending: false, messages: _merge([msg])));
    } catch (e) {
      emit(state.copyWith(sending: false, error: friendlyError(e)));
    }
  }

  Future<void> editMessage(String msgId, String body) async {
    try {
      final updated = await _repo.editMessage(conversationId, msgId, body);
      emit(
        state.copyWith(
          messages: [
            for (final m in state.messages)
              if (m.id == msgId) updated.copyWith(clientId: m.clientId) else m,
          ],
        ),
      );
    } catch (e) {
      emit(state.copyWith(error: friendlyError(e)));
    }
  }

  Future<void> deleteMessage(String msgId) async {
    // optimistik: xabar darhol "o'chirilgan" ko'rinadi, butun suhbat qayta yuklanmaydi
    final prev = state.messages;
    emit(
      state.copyWith(
        messages: [
          for (final m in prev)
            if (m.id == msgId)
              m.copyWith(
                body: '',
                deleted: true,
                updatedAt: DateTime.now().millisecondsSinceEpoch,
              )
            else
              m,
        ],
      ),
    );
    try {
      await _repo.deleteMessage(conversationId, msgId);
    } catch (e) {
      emit(state.copyWith(messages: prev, error: friendlyError(e)));
    }
  }

  /// Emoji reaksiya (Family'dagidek): o'sha emoji qayta bosilsa — olib tashlanadi, boshqasi — almashadi.
  Future<void> react(String msgId, String emoji) async {
    // optimistik yangilash
    final prevMessages = state.messages;
    emit(
      state.copyWith(
        messages: [
          for (final m in state.messages)
            if (m.id == msgId)
              m.copyWith(reactions: MessageReaction.toggle(m.reactions, emoji))
            else
              m,
        ],
      ),
    );
    try {
      final next = await _repo.react(conversationId, msgId, emoji);
      if (isClosed) return;
      emit(
        state.copyWith(
          messages: [
            for (final m in state.messages)
              if (m.id == msgId) m.copyWith(reactions: next) else m,
          ],
        ),
      );
    } catch (_) {
      if (!isClosed) emit(state.copyWith(messages: prevMessages));
    }
  }

  Future<bool> toggleBlock() async {
    try {
      await _repo.block(conversationId, block: !state.blockedByMe);
      emit(state.copyWith(blockedByMe: !state.blockedByMe));
      return true;
    } catch (e) {
      emit(state.copyWith(error: friendlyError(e)));
      return false;
    }
  }

  Future<bool> deleteConversation() async {
    try {
      await _repo.deleteConversation(conversationId);
      return true;
    } catch (e) {
      emit(state.copyWith(error: friendlyError(e)));
      return false;
    }
  }

  Future<bool> report(String body, {String? messageId}) async {
    try {
      await _repo.report(
        suspectId: state.other?.id,
        messageId: messageId,
        body: body,
      );
      return true;
    } catch (e) {
      emit(state.copyWith(error: friendlyError(e)));
      return false;
    }
  }

  @override
  Future<void> close() {
    _pollTimer?.cancel();
    _rtSub?.cancel();
    return super.close();
  }
}
