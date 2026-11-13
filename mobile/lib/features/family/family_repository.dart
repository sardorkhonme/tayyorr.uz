import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../core/network/api_client.dart';
import '../../core/storage/local_storage.dart';
import 'family_models.dart';

/// «Tayyorr's Family» — server API (/api/mobile/family/*).
class FamilyRepository {
  FamilyRepository._();
  static final instance = FamilyRepository._();

  final _api = ApiClient.instance;

  Future<Map<String, dynamic>> load() => _api.get('/mobile/family');

  Future<({List<FamilyMessage> messages, bool hasMore})> older(
    int beforeMs,
  ) async {
    final r = await _api.get('/mobile/family', query: {'before': '$beforeMs'});
    return (
      messages: _list(r['messages']),
      hasMore: r['hasMore'] as bool? ?? false,
    );
  }

  Future<List<FamilyMessage>> since(int updatedAtMs) async {
    final r = await _api.get(
      '/mobile/family',
      query: {'since': '$updatedAtMs'},
    );
    return _list(r['messages']);
  }

  Future<FamilyMessage> send({
    required String body,
    String? replyToId,
    String? as,
    bool notifyAll = false,
    DateTime? sendAt,
    Map<String, Object>? file,
    String? clientId,
  }) async {
    final r = await _api.post(
      '/mobile/family',
      data: {
        if (clientId != null) 'clientId': clientId,
        if (body.trim().isNotEmpty) 'body': body.trim(),
        if (replyToId != null) 'replyToId': replyToId,
        if (as != null && as != 'self') 'as': as,
        if (notifyAll) 'notifyAll': true,
        if (sendAt != null) 'sendAt': sendAt.millisecondsSinceEpoch,
        if (file != null) 'file': file,
      },
    );
    return FamilyMessage.fromJson(
      Map<String, dynamic>.from(r['message'] as Map),
    );
  }

  Future<void> delete(String id) => _api.delete('/mobile/family/$id');

  /// Bir nechta xabarni bittada öçiriş (öz xabari yoki admin — istalganini).
  Future<void> deleteMany(List<String> ids) =>
      _api.post('/mobile/family/bulk-delete', data: {'ids': ids});

  /// O'z xabarini tahrirlash (matn).
  Future<FamilyMessage> edit(String id, String body) async {
    final r = await _api.post(
      '/mobile/family/$id/edit',
      data: {'body': body.trim()},
    );
    return FamilyMessage.fromJson(
      Map<String, dynamic>.from(r['message'] as Map),
    );
  }

  Future<FamilyMessage> pin(
    String id, {
    required bool pinned,
    bool notify = false,
  }) async {
    final r = await _api.patch(
      '/mobile/family/$id',
      data: {'pinned': pinned, 'notify': notify},
    );
    return FamilyMessage.fromJson(
      Map<String, dynamic>.from(r['message'] as Map),
    );
  }

  /// Reaksiya: o'sha emojini qayta bossa yoki null — olib tashlanadi.
  Future<FamilyMessage> react(String id, String? emoji) async {
    final r = await _api.post(
      '/mobile/family/$id/react',
      data: {'emoji': emoji},
    );
    return FamilyMessage.fromJson(
      Map<String, dynamic>.from(r['message'] as Map),
    );
  }

  /// Kim reaksiya bosgan va kim ko'rgan.
  Future<
    ({List<FamilyPerson> reactions, List<FamilyPerson> seen, int seenCount})
  >
  people(String id) async {
    final r = await _api.get('/mobile/family/$id/people');
    List<FamilyPerson> list(Object? v) => (v as List? ?? const [])
        .whereType<Map>()
        .map((m) => FamilyPerson.fromJson(Map<String, dynamic>.from(m)))
        .toList();
    return (
      reactions: list(r['reactions']),
      seen: list(r['seen']),
      seenCount: (r['seenCount'] as num?)?.toInt() ?? 0,
    );
  }

  /// A'zolar va hozir onlayn (yengil so'rov).
  Future<({int? members, int? online})> online() async {
    final r = await _api.get('/mobile/family/online');
    return (
      members: (r['members'] as num?)?.toInt(),
      online: (r['online'] as num?)?.toInt(),
    );
  }

  Future<void> read(int atMs) =>
      _api.post('/mobile/family/read', data: {'at': atMs});

  Future<List<FamilyAuthor>> mention(String q) async {
    final key = q.trim().toLowerCase();
    final r = await _api.get('/mobile/family/mention', query: {'q': key});
    final list = (r['users'] as List? ?? const [])
        .whereType<Map>()
        .map((m) => FamilyAuthor.fromJson(Map<String, dynamic>.from(m)))
        .toList();
    _mentionCache[key] = (at: DateTime.now(), users: list);
    remember(list);
    return list;
  }

  /// @ taklifi uçun keş: so'rov → server javobi (ilova yopilguncha xotirada).
  final _mentionCache = <String, ({DateTime at, List<FamilyAuthor> users})>{};

  /// Ilgari körilgan (serverdan kelgan yoki guruhda yozgan) loginli akkauntlar — @ yozilganda
  /// tarmoqni kutmasdan şu yerdan süzib körsatiladi.
  final mentionPool = <String, FamilyAuthor>{};

  void remember(Iterable<FamilyAuthor> list) {
    for (final a in list) {
      if ((a.login ?? '').isEmpty) continue;
      mentionPool['${a.kind}:${a.id}'] = a;
    }
  }

  /// Keşdagi javob; [maxAge] dan eski bölsa ham qaytadi, [fresh] — yangilaş kerakmi.
  ({List<FamilyAuthor> users, bool fresh})? cachedMention(
    String q, {
    Duration maxAge = const Duration(minutes: 5),
  }) {
    final c = _mentionCache[q.trim().toLowerCase()];
    if (c == null) return null;
    return (users: c.users, fresh: DateTime.now().difference(c.at) < maxAge);
  }

  Future<void> report({
    required String messageId,
    String? suspectId,
    required String body,
  }) => _api.post(
    '/mobile/complaints',
    data: {
      'messageId': messageId,
      if (suspectId != null) 'suspectId': suspectId,
      'body': body,
    },
  );

  /// Faylni R2 ga yuklaydi (presigned PUT) — yuborishga tayyor {key,name,type,size}.
  Future<Map<String, Object>> upload({
    required Uint8List bytes,
    required String filename,
    required String contentType,
    void Function(double)? onProgress,
    CancelToken? cancelToken,
  }) async {
    final p = await _api.post(
      '/mobile/family/upload-presign',
      data: {'filename': filename, 'contentType': contentType},
    );
    await Dio(kUploadOptions).put(
      p['uploadUrl'] as String,
      data: Stream.fromIterable([bytes]),
      cancelToken: cancelToken,
      options: Options(
        headers: {
          'Content-Type': contentType,
          Headers.contentLengthHeader: bytes.length,
        },
      ),
      onSendProgress: (sent, total) {
        if (total > 0) onProgress?.call(sent / total);
      },
    );
    return {
      'key': p['key'] as String,
      'name': filename,
      'type': contentType,
      'size': bytes.length,
    };
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
  final value = ValueNotifier<({int unread, int mentions})>((
    unread: 0,
    mentions: 0,
  ));

  /// Support profili (admin panelda o'zgartiriladi) — «Xabarlar» bo'limidagi qator uchun.
  final support = ValueNotifier<({String name, String? image})?>(null);

  /// tayyorr+ bosh sahifasidagi karta ko'rinsinmi (admin: doim / yo'q / yuklab olgandan N kun).
  final hub = ValueNotifier<bool>(LocalStorage.instance.familyHub);
  DateTime _last = DateTime.fromMillisecondsSinceEpoch(0);

  /// [force] bo'lmasa — 20 soniyada bir martadan ko'p so'ramaydi.
  Future<void> refresh({bool force = false}) async {
    if (!force &&
        DateTime.now().difference(_last) < const Duration(seconds: 20)) {
      return;
    }
    _last = DateTime.now();
    try {
      final r = await ApiClient.instance.get('/mobile/family/summary');
      value.value = (
        unread: (r['unread'] as num?)?.toInt() ?? 0,
        mentions: (r['mentions'] as num?)?.toInt() ?? 0,
      );
      final sp = r['support'];
      if (sp is Map) {
        support.value = (
          name: '${sp['name'] ?? 'Tayyorr Support'}',
          image: sp['image'] as String?,
        );
      }
      final h = r['hub'];
      if (h is bool && h != hub.value) {
        hub.value = h;
        LocalStorage.instance.setFamilyHub(h);
      }
    } catch (_) {
      /* jim — karta raqamsiz ham ishlaydi */
    }
  }

  void clear() => value.value = (unread: 0, mentions: 0);
}

/// Guruh xabarlari keshi: xotirada (ekranga qayta kirganda darhol) va diskda — oxirgi ~50 ta
/// (ilova qayta ochilganda ham shimmersiz ko'rinadi). Foydalanuvchi id'si bo'yicha.
class FamilyCache {
  FamilyCache._();
  static final instance = FamilyCache._();

  static const _boxName = 'family_cache';
  static const _keep = 50;

  String? _uid;
  FamilyMe? me;
  List<FamilyMessage> messages = const [];
  List<FamilyMessage> pinned = const [];
  bool hasMore = false;
  int maxUpdated = 0;
  int? members;
  int? online;
  Timer? _writeTimer;

  /// Xotiradagi kesh (shu foydalanuvchiniki bo'lsa).
  bool has(String uid) => _uid == uid && messages.isNotEmpty;

  /// Diskdan tiklash (xotirada bo'lmasa).
  Future<bool> restore(String uid) async {
    if (has(uid)) return true;
    try {
      final box = await Hive.openBox<String>(_boxName);
      final raw = box.get(uid);
      if (raw == null) return false;
      final j = jsonDecode(raw) as Map<String, dynamic>;
      List<FamilyMessage> list(Object? v) => (v as List? ?? const [])
          .whereType<Map>()
          .map((m) => FamilyMessage.fromJson(Map<String, dynamic>.from(m)))
          .toList();
      _uid = uid;
      me = j['me'] is Map
          ? FamilyMe.fromJson(Map<String, dynamic>.from(j['me'] as Map))
          : null;
      messages = list(j['messages']);
      pinned = list(j['pinned']);
      hasMore = j['hasMore'] as bool? ?? true;
      maxUpdated = (j['maxUpdated'] as num?)?.toInt() ?? 0;
      members = (j['members'] as num?)?.toInt();
      online = null;
      return messages.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Saqlash: xotiraga darhol, diskka — biroz kechiktirib (faqat yuborilgan xabarlar).
  void save(
    String uid, {
    required FamilyMe? me,
    required List<FamilyMessage> messages,
    required List<FamilyMessage> pinned,
    required bool hasMore,
    required int maxUpdated,
    int? members,
    int? online,
  }) {
    final sent = messages.where((m) => !m.isLocal && !m.deleted).toList();
    _uid = uid;
    this.me = me ?? this.me;
    this.messages = sent;
    this.pinned = List.of(pinned);
    this.hasMore = hasMore;
    this.maxUpdated = maxUpdated;
    this.members = members ?? this.members;
    this.online = online ?? this.online;
    _writeTimer?.cancel();
    _writeTimer = Timer(const Duration(milliseconds: 600), () async {
      try {
        final tail = sent.length > _keep
            ? sent.sublist(sent.length - _keep)
            : sent;
        final box = await Hive.openBox<String>(_boxName);
        await box.put(
          uid,
          jsonEncode({
            'me': this.me?.toJson(),
            'messages': [for (final m in tail) m.toJson()],
            'pinned': [for (final m in pinned) m.toJson()],
            // kesilgan bo'lsa — eskilari serverda bor
            'hasMore': hasMore || sent.length > _keep,
            'maxUpdated': maxUpdated,
            'members': this.members,
          }),
        );
      } catch (_) {}
    });
  }
}
