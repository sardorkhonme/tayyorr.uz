import '../../dashboard/data/order_model.dart';

class ReplyPreviewModel {
  final String id;
  final String authorId;
  final String text;
  final bool deleted;

  const ReplyPreviewModel({
    required this.id,
    required this.authorId,
    required this.text,
    required this.deleted,
  });

  factory ReplyPreviewModel.fromJson(Map<String, dynamic> json) {
    return ReplyPreviewModel(
      id: json['id'] as String,
      authorId: json['authorId'] as String,
      text: json['text'] as String,
      deleted: json['deleted'] as bool? ?? false,
    );
  }
}

/// Xabar ostidagi emoji reaksiya («Tayyorr's Family»dagidek): emoji, soni, men bosganmi.
class MessageReaction {
  final String emoji;
  final int count;
  final bool mine;

  const MessageReaction({required this.emoji, required this.count, this.mine = false});

  factory MessageReaction.fromJson(Map<String, dynamic> json) => MessageReaction(
        emoji: json['emoji'] as String? ?? '',
        count: (json['count'] as num?)?.toInt() ?? 0,
        mine: json['mine'] as bool? ?? false,
      );

  /// Server: `emojiReactions` — [{emoji, count, mine}]; eski server — `reactions: {like, dislike, mine}`.
  static List<MessageReaction> listFromJson(Map<String, dynamic> json) {
    final list = json['emojiReactions'] ?? json['reactions'];
    if (list is List) {
      return [
        for (final r in list)
          if (r is Map) MessageReaction.fromJson(Map<String, dynamic>.from(r)),
      ].where((r) => r.emoji.isNotEmpty && r.count > 0).toList();
    }
    if (list is Map) {
      final like = (list['like'] as num?)?.toInt() ?? 0;
      final dislike = (list['dislike'] as num?)?.toInt() ?? 0;
      return [
        if (like > 0) MessageReaction(emoji: '👍', count: like, mine: list['mine'] == 'LIKE'),
        if (dislike > 0) MessageReaction(emoji: '👎', count: dislike, mine: list['mine'] == 'DISLIKE'),
      ];
    }
    return const [];
  }

  /// Optimistik yangilash: o'sha emoji qayta bosilsa — olib tashlanadi, boshqasi — almashadi.
  static List<MessageReaction> toggle(List<MessageReaction> list, String emoji) {
    final cur = list.where((r) => r.mine).map((r) => r.emoji).firstOrNull;
    final next = cur == emoji ? null : emoji;
    final out = <MessageReaction>[
      for (final r in list)
        if (r.mine) MessageReaction(emoji: r.emoji, count: r.count - 1) else r,
    ].where((r) => r.count > 0).toList();
    if (next != null) {
      final i = out.indexWhere((r) => r.emoji == next);
      if (i >= 0) {
        out[i] = MessageReaction(emoji: next, count: out[i].count + 1, mine: true);
      } else {
        out.add(MessageReaction(emoji: next, count: 1, mine: true));
      }
    }
    int rank(String e) {
      final k = kReactionEmojis.indexOf(e);
      return k < 0 ? 99 : k;
    }

    out.sort((a, b) => rank(a.emoji).compareTo(rank(b.emoji)));
    return out;
  }
}

/// Reaksiyalar ro'yxati — Family guruhidagi va saytdagi bilan bir xil.
const kReactionEmojis = ['👍', '👎', '💖', '😂', '😮', '😢', '😡', '🔥', '🙏', '👏'];

class ChatFileModel {
  final String name;
  final String type;
  final int size;
  final String url;

  const ChatFileModel({required this.name, required this.type, required this.size, required this.url});

  /// Kengaytma (kichik harfda), masalan "pdf".
  String get ext => name.contains('.') ? name.split('.').last.toLowerCase() : '';

  bool get isImage => type.startsWith('image/') || const {'jpg', 'jpeg', 'png', 'webp', 'gif'}.contains(ext);
  bool get isVideo => type.startsWith('video/') || const {'mp4', 'mov', 'webm', 'mkv', '3gp'}.contains(ext);
  bool get isAudio =>
      type.startsWith('audio/') || const {'mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac'}.contains(ext);

  factory ChatFileModel.fromJson(Map<String, dynamic> json) {
    return ChatFileModel(
      name: json['name'] as String,
      type: json['type'] as String,
      size: (json['size'] as num).toInt(),
      url: json['url'] as String,
    );
  }
}

/// Xabar ostidagi tugma (masalan "Hisobni ko'rish" → /wallet).
class MessageAction {
  final String url;
  final String label;
  const MessageAction({required this.url, required this.label});
}

/// Yuborish holati (faqat ilovada).
enum ChatSendStatus { sent, pending, failed }

class ChatMessageModel {
  final String id;
  final String senderId;
  final String body;
  final bool system;
  /// Tizim xabari tegishli buyurtma — ostidagi tugma shuni ochadi
  final String? orderId;
  final MessageAction? action;
  final int createdAt; // epoch ms
  final int updatedAt; // epoch ms
  final bool mine;
  final bool edited;
  final bool deleted;
  final ReplyPreviewModel? replyTo;
  final List<MessageReaction> reactions;
  final ChatFileModel? file;

  /// Qabul qiluvchi o'qigan vaqt (epoch ms) — ✓✓ uchun.
  final int? readAt;

  /// Shu qurilmadan optimistik yuborilgan xabarning mahalliy id'si — ro'yxat kaliti barqaror bo'lsin
  /// (server javobi kelganda xabar o'z joyida almashadi).
  final String? clientId;
  final ChatSendStatus status;

  String get stableKey => clientId ?? id;
  bool get isLocal => status != ChatSendStatus.sent;

  const ChatMessageModel({
    required this.id,
    required this.senderId,
    required this.body,
    required this.system,
    this.orderId,
    this.action,
    required this.createdAt,
    required this.updatedAt,
    required this.mine,
    required this.edited,
    required this.deleted,
    this.replyTo,
    this.reactions = const [],
    this.file,
    this.readAt,
    this.clientId,
    this.status = ChatSendStatus.sent,
  });

  ChatMessageModel copyWith({
    String? body,
    bool? edited,
    bool? deleted,
    List<MessageReaction>? reactions,
    String? clientId,
    ChatSendStatus? status,
    int? updatedAt,
  }) =>
      ChatMessageModel(
        id: id,
        senderId: senderId,
        body: body ?? this.body,
        system: system,
        orderId: orderId,
        action: action,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        mine: mine,
        edited: edited ?? this.edited,
        deleted: deleted ?? this.deleted,
        replyTo: replyTo,
        reactions: reactions ?? this.reactions,
        file: deleted == true ? null : file,
        readAt: readAt,
        clientId: clientId ?? this.clientId,
        status: status ?? this.status,
      );

  DateTime get createdAtDate => DateTime.fromMillisecondsSinceEpoch(createdAt);

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id'] as String,
      senderId: json['senderId'] as String,
      body: json['body'] as String? ?? '',
      system: json['system'] as bool? ?? false,
      orderId: json['orderId'] as String?,
      action: json['action'] is Map && (json['action'] as Map)['url'] is String
          ? MessageAction(
              url: (json['action'] as Map)['url'] as String,
              label: ((json['action'] as Map)['label'] as String?) ?? "Köriş",
            )
          : null,
      createdAt: (json['createdAt'] as num).toInt(),
      updatedAt: (json['updatedAt'] as num).toInt(),
      mine: json['mine'] as bool? ?? false,
      edited: json['edited'] as bool? ?? false,
      deleted: json['deleted'] as bool? ?? false,
      replyTo: json['replyTo'] != null ? ReplyPreviewModel.fromJson(json['replyTo'] as Map<String, dynamic>) : null,
      reactions: MessageReaction.listFromJson(json),
      file: json['file'] != null ? ChatFileModel.fromJson(json['file'] as Map<String, dynamic>) : null,
      readAt: (json['readAt'] as num?)?.toInt(),
    );
  }
}

class ChatOtherUser {
  final String id;
  final String name;
  final String? login;
  final String? image;
  final bool isSupport;
  final DateTime? lastSeenAt;

  const ChatOtherUser({
    required this.id,
    required this.name,
    this.login,
    this.image,
    required this.isSupport,
    this.lastSeenAt,
  });

  factory ChatOtherUser.fromJson(Map<String, dynamic> json) {
    return ChatOtherUser(
      id: json['id'] as String,
      name: json['name'] as String,
      login: json['login'] as String?,
      image: json['image'] as String?,
      isSupport: json['isSupport'] as bool? ?? false,
      lastSeenAt: json['lastSeenAt'] != null ? DateTime.parse(json['lastSeenAt'] as String) : null,
    );
  }
}

class ChatContractOrderRef {
  final String id;
  final String title;
  final String type;
  final String status;
  /// SENT — shartnoma yuborilgan (javob kutilmoqda), ACCEPTED — imzolangan
  final String contractStatus;
  /// PENDING — bekor qilish so'ralgan, DISPUTED — admin ko'rib chiqmoqda
  final String? cancelState;
  final DateTime? deadline;

  const ChatContractOrderRef({
    required this.id,
    required this.title,
    required this.type,
    required this.status,
    this.contractStatus = 'ACCEPTED',
    this.cancelState,
    this.deadline,
  });

  /// Qadalgan panel uchun qisqa holat matni (saytdagi pinBadge bilan bir xil).
  /// Ikonkasi UI'da [badgeKind] bo'yicha qo'yiladi.
  String get badge {
    if (contractStatus == 'SENT') return 'Şartnoma yuborilgan';
    if (cancelState == 'DISPUTED') return "Admin körib çiqmoqda";
    if (cancelState == 'PENDING') return "Bekor qiliş söralgan";
    return kOrderStatusLabel[status] ?? status;
  }

  /// 'contract' | 'disputed' | 'pending' | null — badge ikonkasini tanlash uchun.
  String? get badgeKind {
    if (contractStatus == 'SENT') return 'contract';
    if (cancelState == 'DISPUTED') return 'disputed';
    if (cancelState == 'PENDING') return 'pending';
    return null;
  }

  factory ChatContractOrderRef.fromJson(Map<String, dynamic> json) {
    return ChatContractOrderRef(
      id: json['id'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      contractStatus: json['contractStatus'] as String? ?? 'ACCEPTED',
      cancelState: json['cancelState'] as String?,
      deadline: json['deadline'] != null ? DateTime.parse(json['deadline'] as String) : null,
    );
  }
}

class ChatConversationData {
  final ChatOtherUser? other;
  final List<ChatMessageModel> messages;
  final bool blockedMe;
  final bool blockedByMe;
  final List<ChatContractOrderRef> activeContracts;

  const ChatConversationData({
    this.other,
    required this.messages,
    this.blockedMe = false,
    this.blockedByMe = false,
    this.activeContracts = const [],
  });
}

class ConversationModel {
  final String id;
  final ChatOtherUser other;
  final String? lastMessageBody;
  final bool? lastMessageMine;
  final DateTime lastMessageAt;
  final DateTime? lastMessageCreatedAt;
  final int unread;
  final bool blockedMe;

  const ConversationModel({
    required this.id,
    required this.other,
    this.lastMessageBody,
    this.lastMessageMine,
    required this.lastMessageAt,
    this.lastMessageCreatedAt,
    required this.unread,
    this.blockedMe = false,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    final last = json['lastMessage'] as Map<String, dynamic>?;
    return ConversationModel(
      id: json['id'] as String,
      other: ChatOtherUser.fromJson(json['other'] as Map<String, dynamic>),
      lastMessageBody: last?['body'] as String?,
      lastMessageMine: last?['mine'] as bool?,
      lastMessageAt: DateTime.parse(json['lastMessageAt'] as String),
      lastMessageCreatedAt: last?['createdAt'] != null ? DateTime.parse(last!['createdAt'] as String) : null,
      unread: (json['unread'] as num?)?.toInt() ?? 0,
      blockedMe: json['blockedMe'] as bool? ?? false,
    );
  }
}
