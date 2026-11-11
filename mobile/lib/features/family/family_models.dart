import '../messages/data/message_model.dart';

/// Xabar muallifi: oddiy foydalanuvchi yoki maxsus nomlar — «Tayyorr.uz» (anonim) / «Tayyorr Support».
class FamilyAuthor {
  const FamilyAuthor({required this.kind, required this.id, required this.name, this.login, this.image});

  /// 'user' | 'brand' | 'support'
  final String kind;
  final String id;
  final String name;
  final String? login;
  final String? image;

  bool get isUser => kind == 'user';
  bool get isOfficial => kind == 'brand' || kind == 'support';

  String get initial {
    final c = name.replaceFirst('@', '').trim();
    return c.isEmpty ? '?' : c.substring(0, 1).toUpperCase();
  }

  factory FamilyAuthor.fromJson(Map<String, dynamic> j) => FamilyAuthor(
        kind: j['kind'] as String? ?? 'user',
        id: '${j['id']}',
        name: j['name'] as String? ?? 'Foydalanuvçi',
        login: j['login'] as String?,
        image: j['image'] as String?,
      );
}

class FamilyReply {
  const FamilyReply({required this.id, required this.authorName, required this.text, required this.deleted});
  final String id;
  final String authorName;
  final String text;
  final bool deleted;

  factory FamilyReply.fromJson(Map<String, dynamic> j) => FamilyReply(
        id: j['id'] as String,
        authorName: j['authorName'] as String? ?? '',
        text: j['text'] as String? ?? '',
        deleted: j['deleted'] as bool? ?? false,
      );
}

class FamilyMention {
  const FamilyMention(this.id, this.login);
  final String id;
  final String login;
}

class FamilyMessage {
  const FamilyMessage({
    required this.id,
    required this.author,
    required this.mine,
    required this.body,
    required this.file,
    required this.expiredFile,
    required this.replyTo,
    required this.mentions,
    required this.notifyAll,
    required this.pinned,
    required this.scheduled,
    required this.sendAt,
    required this.updatedAt,
    required this.deleted,
  });

  final String id;
  final FamilyAuthor author;

  /// null — server aytmagan (realtime orqali kelgan): ekran o'zi aniqlaydi.
  final bool? mine;
  final String body;
  final ChatFileModel? file;

  /// 5 kundan eski fayl — nomi va o'lchami (ochilmaydi).
  final ChatFileModel? expiredFile;
  final FamilyReply? replyTo;
  final List<FamilyMention> mentions;
  final bool notifyAll;
  final bool pinned;
  final bool scheduled;
  final DateTime sendAt;
  final int updatedAt;
  final bool deleted;

  int get sendAtMs => sendAt.millisecondsSinceEpoch;

  /// Matn bo'lmasa — fayl nomi.
  String get preview {
    if (deleted) return 'öçirilgan xabar';
    if (body.trim().isNotEmpty) return body.trim();
    final f = file ?? expiredFile;
    return f != null ? '📎 ${f.name}' : 'xabar';
  }

  /// Meni (yoki admin bo'lsam — Tayyorr.uz / Support ni) belgilaganmi.
  bool mentionsMe(String meId, bool isAdmin) =>
      mentions.any((m) => m.id == meId || (isAdmin && (m.id == 'brand' || m.id == 'support')));

  FamilyMessage withMine(bool v) => FamilyMessage(
        id: id,
        author: author,
        mine: v,
        body: body,
        file: file,
        expiredFile: expiredFile,
        replyTo: replyTo,
        mentions: mentions,
        notifyAll: notifyAll,
        pinned: pinned,
        scheduled: scheduled,
        sendAt: sendAt,
        updatedAt: updatedAt,
        deleted: deleted,
      );

  factory FamilyMessage.fromJson(Map<String, dynamic> j) {
    ChatFileModel? meta(Object? v, {bool withUrl = true}) {
      if (v is! Map) return null;
      final m = Map<String, dynamic>.from(v);
      return ChatFileModel(
        name: m['name'] as String? ?? 'fayl',
        type: m['type'] as String? ?? 'application/octet-stream',
        size: (m['size'] as num?)?.toInt() ?? 0,
        url: withUrl ? (m['url'] as String? ?? '') : '',
      );
    }

    return FamilyMessage(
      id: j['id'] as String,
      author: FamilyAuthor.fromJson(Map<String, dynamic>.from(j['author'] as Map)),
      mine: j['mine'] as bool?,
      body: j['body'] as String? ?? '',
      file: meta(j['file']),
      expiredFile: meta(j['expiredFile'], withUrl: false),
      replyTo: j['replyTo'] is Map ? FamilyReply.fromJson(Map<String, dynamic>.from(j['replyTo'] as Map)) : null,
      mentions: (j['mentions'] as List? ?? const [])
          .whereType<Map>()
          .map((m) => FamilyMention('${m['id']}', '${m['login']}'))
          .toList(),
      notifyAll: j['notifyAll'] as bool? ?? false,
      pinned: j['pinned'] as bool? ?? false,
      scheduled: j['scheduled'] as bool? ?? false,
      sendAt: DateTime.fromMillisecondsSinceEpoch((j['sendAt'] as num).toInt()),
      updatedAt: (j['updatedAt'] as num?)?.toInt() ?? 0,
      deleted: j['deleted'] as bool? ?? false,
    );
  }
}

/// Men: admin bo'lsam — qaysi nomlardan yoza olaman.
class FamilyMe {
  const FamilyMe({required this.id, required this.isAdmin, required this.identities});
  final String id;
  final bool isAdmin;
  final List<FamilyAuthor> identities;

  factory FamilyMe.fromJson(Map<String, dynamic> j) => FamilyMe(
        id: j['id'] as String,
        isAdmin: j['isAdmin'] as bool? ?? false,
        identities: (j['identities'] as List? ?? const [])
            .whereType<Map>()
            .map((m) => FamilyAuthor.fromJson(Map<String, dynamic>.from(m)))
            .toList(),
      );
}
