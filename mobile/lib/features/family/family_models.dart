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

/// Guruhdagi reaksiyalar (serverdagi FAMILY_EMOJIS bilan bir xil).
const kFamilyEmojis = ['👍', '👎', '💖', '😂', '😮', '😢', '😡', '🔥', '🙏', '👏'];

class FamilyReaction {
  const FamilyReaction({required this.emoji, required this.count, required this.users});
  final String emoji;
  final int count;

  /// Bosganlar id'lari (≤50) — «meniki»ni aniqlash uchun.
  final List<String> users;

  factory FamilyReaction.fromJson(Map<String, dynamic> j) => FamilyReaction(
        emoji: '${j['emoji']}',
        count: (j['count'] as num?)?.toInt() ?? 0,
        users: (j['users'] as List? ?? const []).map((e) => '$e').toList(),
      );
}

class FamilyMention {
  const FamilyMention(this.id, this.login);
  final String id;
  final String login;
}

/// Admin uchun: Tayyorr.uz / Support nomidan haqiqatda kim yozgan.
class FamilyBy {
  const FamilyBy({required this.id, required this.name, this.login});
  final String id;
  final String name;
  final String? login;

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'login': login};
  factory FamilyBy.fromJson(Map<String, dynamic> j) => FamilyBy(id: '${j['id']}', name: j['name'] as String? ?? '', login: j['login'] as String?);
}

/// Yuborish holati (faqat ilovada): yuborilgan / yuborilmoqda / yuborilmadi.
enum FamilySendStatus { sent, pending, failed }

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
    this.reactions = const [],
    this.seen = 0,
    this.edited = false,
    this.clientId,
    this.by,
    this.status = FamilySendStatus.sent,
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
  final List<FamilyReaction> reactions;

  /// Nechta a'zo ko'rgan (muallifdan tashqari).
  final int seen;
  final bool edited;

  /// Shu qurilmada yuborilgan xabarning mahalliy id'si — vidjet kaliti shu bilan barqaror
  /// (server javobi kelganda xabar o'z joyida almashadi, yo'qolib qayta paydo bo'lmaydi).
  final String? clientId;

  /// Faqat admin ko'radi: Tayyorr.uz / Support nomidan yozilgan bo'lsa — haqiqiy muallif.
  final FamilyBy? by;
  final FamilySendStatus status;

  int get sendAtMs => sendAt.millisecondsSinceEpoch;

  /// Ro'yxatdagi barqaror kalit.
  String get stableKey => clientId ?? id;

  /// Fayl keshi kaliti (mahalliy fayl yuborilgach ham o'sha kalit — qayta yuklanmaydi).
  String get cacheKey => 'f-$stableKey';

  bool get isLocal => status != FamilySendStatus.sent;

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

  /// Mening reaksiyam (bo'lsa).
  String? myReaction(String meId) {
    for (final r in reactions) {
      if (r.users.contains(meId)) return r.emoji;
    }
    return null;
  }

  /// Reaksiyani mahalliy (optimistik) almashtirish: bir xabarga bitta; o'shani qayta bossa — olib tashlanadi.
  FamilyMessage toggledReaction(String meId, String emoji) {
    final had = myReaction(meId);
    final list = <FamilyReaction>[];
    for (final r in reactions) {
      final users = r.users.where((u) => u != meId).toList();
      final count = r.users.contains(meId) ? r.count - 1 : r.count;
      if (r.emoji == emoji && had != emoji) {
        list.add(FamilyReaction(emoji: r.emoji, count: count + 1, users: [...users, meId]));
      } else if (count > 0) {
        list.add(FamilyReaction(emoji: r.emoji, count: count, users: users));
      }
    }
    if (had != emoji && !list.any((r) => r.emoji == emoji)) {
      list.add(FamilyReaction(emoji: emoji, count: 1, users: [meId]));
    }
    return copyWith(reactions: list);
  }

  FamilyMessage copyWith({
    bool? mine,
    List<FamilyReaction>? reactions,
    String? body,
    bool? edited,
    String? clientId,
    FamilyBy? by,
    FamilySendStatus? status,
  }) =>
      FamilyMessage(
        id: id,
        author: author,
        mine: mine ?? this.mine,
        body: body ?? this.body,
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
        reactions: reactions ?? this.reactions,
        seen: seen,
        edited: edited ?? this.edited,
        clientId: clientId ?? this.clientId,
        by: by ?? this.by,
        status: status ?? this.status,
      );

  FamilyMessage withMine(bool v) => copyWith(mine: v);

  /// Disk keshi uchun (server JSON'i bilan bir xil shakl).
  Map<String, dynamic> toJson() {
    Map<String, dynamic>? f(ChatFileModel? x) => x == null ? null : {'name': x.name, 'type': x.type, 'size': x.size, 'url': x.url};
    return {
      'id': id,
      'author': {'kind': author.kind, 'id': author.id, 'name': author.name, 'login': author.login, 'image': author.image},
      'mine': mine,
      'body': body,
      'file': f(file),
      'expiredFile': f(expiredFile),
      'replyTo': replyTo == null
          ? null
          : {'id': replyTo!.id, 'authorName': replyTo!.authorName, 'text': replyTo!.text, 'deleted': replyTo!.deleted},
      'mentions': [for (final m in mentions) {'id': m.id, 'login': m.login}],
      'notifyAll': notifyAll,
      'pinned': pinned,
      'scheduled': scheduled,
      'sendAt': sendAtMs,
      'updatedAt': updatedAt,
      'deleted': deleted,
      'reactions': [for (final r in reactions) {'emoji': r.emoji, 'count': r.count, 'users': r.users}],
      'seen': seen,
      'edited': edited,
      'clientId': clientId,
      'by': by?.toJson(),
    };
  }

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
      reactions: (j['reactions'] as List? ?? const [])
          .whereType<Map>()
          .map((r) => FamilyReaction.fromJson(Map<String, dynamic>.from(r)))
          .toList(),
      seen: (j['seen'] as num?)?.toInt() ?? 0,
      edited: j['edited'] as bool? ?? false,
      clientId: j['clientId'] as String?,
      by: j['by'] is Map ? FamilyBy.fromJson(Map<String, dynamic>.from(j['by'] as Map)) : null,
    );
  }
}

/// Xabar bo'yicha: kim reaksiya bosgan / kim ko'rgan.
class FamilyPerson {
  const FamilyPerson({required this.user, required this.at, this.emoji});
  final FamilyAuthor user;
  final DateTime at;
  final String? emoji;

  factory FamilyPerson.fromJson(Map<String, dynamic> j) => FamilyPerson(
        user: FamilyAuthor.fromJson({'kind': 'user', ...Map<String, dynamic>.from(j['user'] as Map)}),
        at: DateTime.fromMillisecondsSinceEpoch((j['at'] as num).toInt()),
        emoji: j['emoji'] as String?,
      );
}

/// Men: admin bo'lsam — qaysi nomlardan yoza olaman.
class FamilyMe {
  const FamilyMe({required this.id, required this.isAdmin, required this.identities});
  final String id;
  final bool isAdmin;
  final List<FamilyAuthor> identities;

  Map<String, dynamic> toJson() => {
        'id': id,
        'isAdmin': isAdmin,
        'identities': [for (final a in identities) {'kind': a.kind, 'id': a.id, 'name': a.name, 'login': a.login, 'image': a.image}],
      };

  factory FamilyMe.fromJson(Map<String, dynamic> j) => FamilyMe(
        id: j['id'] as String,
        isAdmin: j['isAdmin'] as bool? ?? false,
        identities: (j['identities'] as List? ?? const [])
            .whereType<Map>()
            .map((m) => FamilyAuthor.fromJson(Map<String, dynamic>.from(m)))
            .toList(),
      );
}
