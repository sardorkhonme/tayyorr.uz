import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'family_models.dart';

/// «Tayyorr's Family» — server API (/api/mobile/family/*).
class FamilyRepository {
  FamilyRepository._();
  static final instance = FamilyRepository._();

  final _api = ApiClient.instance;

  Future<Map<String, dynamic>> load() => _api.get('/mobile/family');

  Future<({List<FamilyMessage> messages, bool hasMore})> older(int beforeMs) async {
    final r = await _api.get('/mobile/family', query: {'before': '$beforeMs'});
    return (messages: _list(r['messages']), hasMore: r['hasMore'] as bool? ?? false);
  }

  Future<List<FamilyMessage>> since(int updatedAtMs) async {
    final r = await _api.get('/mobile/family', query: {'since': '$updatedAtMs'});
    return _list(r['messages']);
  }

  Future<FamilyMessage> send({
    required String body,
    String? replyToId,
    String? as,
    bool notifyAll = false,
    DateTime? sendAt,
    Map<String, Object>? file,
  }) async {
    final r = await _api.post('/mobile/family', data: {
      if (body.trim().isNotEmpty) 'body': body.trim(),
      if (replyToId != null) 'replyToId': replyToId,
      if (as != null && as != 'self') 'as': as,
      if (notifyAll) 'notifyAll': true,
      if (sendAt != null) 'sendAt': sendAt.millisecondsSinceEpoch,
      if (file != null) 'file': file,
    });
    return FamilyMessage.fromJson(Map<String, dynamic>.from(r['message'] as Map));
  }

  Future<void> delete(String id) => _api.delete('/mobile/family/$id');

  Future<FamilyMessage> pin(String id, {required bool pinned, bool notify = false}) async {
    final r = await _api.patch('/mobile/family/$id', data: {'pinned': pinned, 'notify': notify});
    return FamilyMessage.fromJson(Map<String, dynamic>.from(r['message'] as Map));
  }

  /// Reaksiya: o'sha emojini qayta bossa yoki null — olib tashlanadi.
  Future<FamilyMessage> react(String id, String? emoji) async {
    final r = await _api.post('/mobile/family/$id/react', data: {'emoji': emoji});
    return FamilyMessage.fromJson(Map<String, dynamic>.from(r['message'] as Map));
  }

  /// Kim reaksiya bosgan va kim ko'rgan.
  Future<({List<FamilyPerson> reactions, List<FamilyPerson> seen, int seenCount})> people(String id) async {
    final r = await _api.get('/mobile/family/$id/people');
    List<FamilyPerson> list(Object? v) =>
        (v as List? ?? const []).whereType<Map>().map((m) => FamilyPerson.fromJson(Map<String, dynamic>.from(m))).toList();
    return (reactions: list(r['reactions']), seen: list(r['seen']), seenCount: (r['seenCount'] as num?)?.toInt() ?? 0);
  }

  /// A'zolar va hozir onlayn (yengil so'rov).
  Future<({int? members, int? online})> online() async {
    final r = await _api.get('/mobile/family/online');
    return (members: (r['members'] as num?)?.toInt(), online: (r['online'] as num?)?.toInt());
  }

  Future<void> read(int atMs) => _api.post('/mobile/family/read', data: {'at': atMs});

  Future<List<FamilyAuthor>> mention(String q) async {
    final r = await _api.get('/mobile/family/mention', query: {'q': q});
    return (r['users'] as List? ?? const [])
        .whereType<Map>()
        .map((m) => FamilyAuthor.fromJson(Map<String, dynamic>.from(m)))
        .toList();
  }

  Future<void> report({required String messageId, String? suspectId, required String body}) => _api.post(
        '/mobile/complaints',
        data: {'messageId': messageId, if (suspectId != null) 'suspectId': suspectId, 'body': body},
      );

  /// Faylni R2 ga yuklaydi (presigned PUT) — yuborishga tayyor {key,name,type,size}.
  Future<Map<String, Object>> upload({
    required Uint8List bytes,
    required String filename,
    required String contentType,
    void Function(double)? onProgress,
    CancelToken? cancelToken,
  }) async {
    final p = await _api.post('/mobile/family/upload-presign', data: {'filename': filename, 'contentType': contentType});
    await Dio().put(
      p['uploadUrl'] as String,
      data: Stream.fromIterable([bytes]),
      cancelToken: cancelToken,
      options: Options(headers: {'Content-Type': contentType, Headers.contentLengthHeader: bytes.length}),
      onSendProgress: (sent, total) {
        if (total > 0) onProgress?.call(sent / total);
      },
    );
    return {'key': p['key'] as String, 'name': filename, 'type': contentType, 'size': bytes.length};
  }

  static List<FamilyMessage> _list(Object? v) => (v as List? ?? const [])
      .whereType<Map>()
      .map((m) => FamilyMessage.fromJson(Map<String, dynamic>.from(m)))
      .toList();
}

/// Bosh sahifa kartasi va Xabarlar ro'yxatidagi qator uchun: o'qilmaganlar / belgilashlar soni.
class FamilySummary {
  FamilySummary._();
  static final instance = FamilySummary._();

  /// (o'qilmagan, belgilashlar)
  final value = ValueNotifier<({int unread, int mentions})>((unread: 0, mentions: 0));

  /// Support profili (admin panelda o'zgartiriladi) — «Xabarlar» bo'limidagi qator uchun.
  final support = ValueNotifier<({String name, String? image})?>(null);
  DateTime _last = DateTime.fromMillisecondsSinceEpoch(0);

  /// [force] bo'lmasa — 20 soniyada bir martadan ko'p so'ramaydi.
  Future<void> refresh({bool force = false}) async {
    if (!force && DateTime.now().difference(_last) < const Duration(seconds: 20)) return;
    _last = DateTime.now();
    try {
      final r = await ApiClient.instance.get('/mobile/family/summary');
      value.value = (unread: (r['unread'] as num?)?.toInt() ?? 0, mentions: (r['mentions'] as num?)?.toInt() ?? 0);
      final sp = r['support'];
      if (sp is Map) support.value = (name: '${sp['name'] ?? 'Tayyorr Support'}', image: sp['image'] as String?);
    } catch (_) {
      /* jim — karta raqamsiz ham ishlaydi */
    }
  }

  void clear() => value.value = (unread: 0, mentions: 0);
}
