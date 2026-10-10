import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../data/message_model.dart';
import '../data/messages_repository.dart';

enum ConversationsStatus { initial, loading, success, failure }

class ConversationsState extends Equatable {
  const ConversationsState({
    this.status = ConversationsStatus.initial,
    this.conversations = const [],
    this.error,
  });

  final ConversationsStatus status;
  final List<ConversationModel> conversations;
  final String? error;

  ConversationsState copyWith({
    ConversationsStatus? status,
    List<ConversationModel>? conversations,
    String? error,
  }) {
    return ConversationsState(
      status: status ?? this.status,
      conversations: conversations ?? this.conversations,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, conversations, error];
}

class ConversationsCubit extends Cubit<ConversationsState> with SafeEmit<ConversationsState> {
  ConversationsCubit(this._repo) : super(const ConversationsState());

  final MessagesRepository _repo;

  Future<void> load() async {
    emit(state.copyWith(status: ConversationsStatus.loading));
    try {
      final list = await _repo.fetchConversations();
      emit(state.copyWith(status: ConversationsStatus.success, conversations: list));
    } on ApiException catch (e) {
      emit(state.copyWith(status: ConversationsStatus.failure, error: e.message));
    }
  }
}
