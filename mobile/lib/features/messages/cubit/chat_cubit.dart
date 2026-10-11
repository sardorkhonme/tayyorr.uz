import 'dart:async';
import 'dart:typed_data';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/notifications/message_notifier.dart';
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
  List<Object?> get props =>
      [status, other, messages, error, sending, blockedMe, blockedByMe, activeContracts, replyTo?.id];
}

class ChatCubit extends Cubit<ChatState> with SafeEmit<ChatState> {
  ChatCubit(this._repo, this.conversationId) : super(const ChatState());

  final MessagesRepository _repo;
  final String conversationId;
  Timer? _pollTimer;

  Future<void> load() async {
    emit(state.copyWith(status: ChatStatus.loading));
    try {
      final data = await _repo.fetchConversation(conversationId);
      emit(state.copyWith(
        status: ChatStatus.success,
        other: data.other,
        messages: data.messages,
        blockedMe: data.blockedMe,
        blockedByMe: data.blockedByMe,
        activeContracts: data.activeContracts,
      ));
      unawaited(_repo.markRead(conversationId).catchError((_) {}));
      _startPolling();
    } on ApiException catch (e) {
      emit(state.copyWith(status: ChatStatus.failure, error: e.message));
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _poll());
  }

  Future<void> _poll() async {
    try {
      final since = state.messages.isEmpty
          ? null
          : state.messages.map((m) => m.updatedAt).reduce((a, b) => a > b ? a : b);
      final data = await _repo.fetchConversation(conversationId, since: since);
      final merged = Map<String, ChatMessageModel>.fromEntries(
        state.messages.map((m) => MapEntry(m.id, m)),
      );
      // boshqa tomondan yangi xabar keldi — Telegramdagidek qisqa "tin"
      if (data.messages.any((m) => !m.mine && !m.system && !merged.containsKey(m.id))) {
        MessageNotifier.instance.playTin();
      }
      for (final m in data.messages) {
        merged[m.id] = m;
      }
      final list = merged.values.toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt));
      emit(state.copyWith(
        messages: list,
        blockedMe: data.blockedMe,
        blockedByMe: data.blockedByMe,
        activeContracts: data.activeContracts,
      ));
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

  Future<void> send(String body) async {
    final text = body.trim();
    if (text.isEmpty) return;
    final replyId = state.replyTo?.id;
    emit(state.copyWith(sending: true, error: null, clearReply: true));
    try {
      final msg = await _repo.sendMessage(conversationId, body: text, replyToId: replyId);
      emit(state.copyWith(sending: false, messages: [...state.messages, msg]));
    } on ApiException catch (e) {
      emit(state.copyWith(sending: false, error: e.message));
    }
  }

  /// Oldindan yuklangan fayl (va ixtiyoriy matn) bilan xabar yuborish.
  Future<ChatMessageModel?> sendPrepared({required Map<String, Object> file, String? body}) async {
    final replyId = state.replyTo?.id;
    final text = body?.trim();
    emit(state.copyWith(sending: true, error: null, clearReply: true));
    try {
      final msg = await _repo.sendMessage(
        conversationId,
        body: (text == null || text.isEmpty) ? null : text,
        replyToId: replyId,
        file: file,
      );
      emit(state.copyWith(sending: false, messages: [...state.messages, msg]));
      return msg;
    } on ApiException catch (e) {
      emit(state.copyWith(sending: false, error: e.message));
      return null;
    }
  }

  Future<void> sendFile({required Uint8List bytes, required String filename, required String contentType}) async {
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
      emit(state.copyWith(sending: false, messages: [...state.messages, msg]));
    } on ApiException catch (e) {
      emit(state.copyWith(sending: false, error: e.message));
    }
  }

  Future<void> editMessage(String msgId, String body) async {
    try {
      final updated = await _repo.editMessage(conversationId, msgId, body);
      emit(state.copyWith(messages: [
        for (final m in state.messages) if (m.id == msgId) updated else m,
      ]));
    } on ApiException catch (e) {
      emit(state.copyWith(error: e.message));
    }
  }

  Future<void> deleteMessage(String msgId) async {
    // optimistik: xabar darhol "o'chirilgan" ko'rinadi, butun suhbat qayta yuklanmaydi
    final prev = state.messages;
    emit(state.copyWith(messages: [
      for (final m in prev)
        if (m.id == msgId)
          ChatMessageModel(
            id: m.id,
            senderId: m.senderId,
            body: '',
            system: m.system,
            orderId: m.orderId,
            createdAt: m.createdAt,
            updatedAt: DateTime.now().millisecondsSinceEpoch,
            mine: m.mine,
            edited: m.edited,
            deleted: true,
            replyTo: m.replyTo,
            reactions: m.reactions,
          )
        else
          m,
    ]));
    try {
      await _repo.deleteMessage(conversationId, msgId);
    } on ApiException catch (e) {
      emit(state.copyWith(messages: prev, error: e.message));
    }
  }

  Future<void> react(String msgId, String? value) async {
    // optimistik yangilash
    final prevMessages = state.messages;
    emit(state.copyWith(messages: [
      for (final m in state.messages)
        if (m.id == msgId)
          ChatMessageModel(
            id: m.id,
            senderId: m.senderId,
            body: m.body,
            system: m.system,
            orderId: m.orderId,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            mine: m.mine,
            edited: m.edited,
            deleted: m.deleted,
            replyTo: m.replyTo,
            reactions: ReactionSummary(
              like: value == 'LIKE'
                  ? m.reactions.like + (m.reactions.mine == 'LIKE' ? 0 : 1)
                  : m.reactions.like - (m.reactions.mine == 'LIKE' ? 1 : 0),
              dislike: value == 'DISLIKE'
                  ? m.reactions.dislike + (m.reactions.mine == 'DISLIKE' ? 0 : 1)
                  : m.reactions.dislike - (m.reactions.mine == 'DISLIKE' ? 1 : 0),
              mine: value,
            ),
            file: m.file,
          )
        else
          m,
    ]));
    try {
      await _repo.react(conversationId, msgId, value);
    } catch (_) {
      emit(state.copyWith(messages: prevMessages));
    }
  }

  Future<bool> toggleBlock() async {
    try {
      await _repo.block(conversationId, block: !state.blockedByMe);
      emit(state.copyWith(blockedByMe: !state.blockedByMe));
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(error: e.message));
      return false;
    }
  }

  Future<bool> deleteConversation() async {
    try {
      await _repo.deleteConversation(conversationId);
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(error: e.message));
      return false;
    }
  }

  Future<bool> report(String body, {String? messageId}) async {
    try {
      await _repo.report(suspectId: state.other?.id, messageId: messageId, body: body);
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(error: e.message));
      return false;
    }
  }

  @override
  Future<void> close() {
    _pollTimer?.cancel();
    return super.close();
  }
}
