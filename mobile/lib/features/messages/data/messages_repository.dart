import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import 'message_model.dart';

class MessagesRepository {
  final _api = ApiClient.instance;

  Future<List<ConversationModel>> fetchConversations() async {
    final res = await _api.get('/mobile/messages');
    final list = (res['conversations'] as List).cast<Map<String, dynamic>>();
    return list.map(ConversationModel.fromJson).toList();
  }

  Future<ChatConversationData> fetchConversation(String id, {int? since}) async {
    final res = await _api.get('/mobile/messages/$id', query: since != null ? {'since': since} : null);
    final other = res['other'] != null ? ChatOtherUser.fromJson(res['other'] as Map<String, dynamic>) : null;
    final messages =
        (res['messages'] as List).cast<Map<String, dynamic>>().map(ChatMessageModel.fromJson).toList();
    final contracts = (res['activeContracts'] as List? ?? [])
        .cast<Map<String, dynamic>>()
        .map(ChatContractOrderRef.fromJson)
        .toList();
    return ChatConversationData(
      other: other,
      messages: messages,
      blockedMe: res['blockedMe'] as bool? ?? false,
      blockedByMe: res['blockedByMe'] as bool? ?? false,
      activeContracts: contracts,
    );
  }

  Future<ChatMessageModel> sendMessage(
    String conversationId, {
    String? body,
    String? replyToId,
    Map<String, dynamic>? file,
  }) async {
    final res = await _api.post('/mobile/messages/$conversationId', data: {
      if (body != null && body.isNotEmpty) 'body': body,
      if (replyToId != null) 'replyToId': replyToId,
      if (file != null) 'file': file,
    });
    return ChatMessageModel.fromJson(res['message'] as Map<String, dynamic>);
  }

  Future<ChatMessageModel> editMessage(String conversationId, String msgId, String body) async {
    final res = await _api.patch('/mobile/messages/$conversationId/$msgId', data: {'body': body});
    return ChatMessageModel.fromJson(res['message'] as Map<String, dynamic>);
  }

  Future<void> deleteMessage(String conversationId, String msgId) async {
    await _api.delete('/mobile/messages/$conversationId/$msgId');
  }

  Future<ReactionSummary> react(String conversationId, String msgId, String? value) async {
    final res = await _api.post('/mobile/messages/$conversationId/$msgId/react', data: {'value': value});
    return ReactionSummary(like: res['like'] as int, dislike: res['dislike'] as int, mine: res['mine'] as String?);
  }

  Future<void> block(String conversationId, {required bool block}) async {
    await _api.post('/mobile/messages/$conversationId/block', data: {'action': block ? 'BLOCK' : 'UNBLOCK'});
  }

  Future<void> deleteConversation(String conversationId) async {
    await _api.delete('/mobile/messages/$conversationId');
  }

  Future<String> startConversation(String userId, {String? orderId}) async {
    final res = await _api.post('/mobile/messages/start', data: {
      'userId': userId,
      if (orderId != null) 'orderId': orderId,
    });
    return res['conversationId'] as String;
  }

  Future<void> report({String? suspectId, String? orderId, String? messageId, required String body}) async {
    await _api.post('/mobile/complaints', data: {
      if (suspectId != null) 'suspectId': suspectId,
      if (orderId != null) 'orderId': orderId,
      if (messageId != null) 'messageId': messageId,
      'body': body,
    });
  }

  Future<void> markRead(String conversationId) async {
    await _api.post('/mobile/messages/$conversationId/read');
  }

  /// Chatga fayl biriktiradi: R2'ga to'g'ridan PUT qiladi, so'ng xabar sifatida yuboradi.
  /// Faylni R2'ga yuklaydi (xabar hali YUBORILMAYDI) — [onProgress] 0..1.
  /// Qaytgan qiymat `sendMessage(file: ...)` ga beriladi.
  Future<Map<String, Object>> uploadChatFile(
    String conversationId, {
    required Uint8List bytes,
    required String filename,
    required String contentType,
    void Function(double)? onProgress,
    CancelToken? cancelToken,
  }) async {
    final presign = await _api.post('/mobile/messages/$conversationId/upload-presign', data: {
      'filename': filename,
      'contentType': contentType,
    });
    await Dio().put(
      presign['uploadUrl'] as String,
      data: Stream.fromIterable([bytes]),
      cancelToken: cancelToken,
      options: Options(headers: {'Content-Type': contentType, Headers.contentLengthHeader: bytes.length}),
      onSendProgress: (sent, total) {
        if (total > 0) onProgress?.call(sent / total);
      },
    );
    return {'key': presign['key'] as String, 'name': filename, 'type': contentType, 'size': bytes.length};
  }

  Future<ChatMessageModel> sendFile(
    String conversationId, {
    required Uint8List bytes,
    required String filename,
    required String contentType,
    String? body,
    String? replyToId,
  }) async {
    final presign = await _api.post('/mobile/messages/$conversationId/upload-presign', data: {
      'filename': filename,
      'contentType': contentType,
    });
    final uploadUrl = presign['uploadUrl'] as String;
    final key = presign['key'] as String;

    await Dio().put(
      uploadUrl,
      data: bytes,
      options: Options(headers: {'Content-Type': contentType}),
    );

    return sendMessage(
      conversationId,
      body: body,
      replyToId: replyToId,
      file: {'key': key, 'name': filename, 'type': contentType, 'size': bytes.length},
    );
  }
}
