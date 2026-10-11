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

class ReactionSummary {
  final int like;
  final int dislike;
  final String? mine; // 'LIKE' | 'DISLIKE' | null

  const ReactionSummary({required this.like, required this.dislike, this.mine});

  factory ReactionSummary.fromJson(Map<String, dynamic> json) {
    return ReactionSummary(
      like: (json['like'] as num?)?.toInt() ?? 0,
      dislike: (json['dislike'] as num?)?.toInt() ?? 0,
      mine: json['mine'] as String?,
    );
  }
}

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

class ChatMessageModel {
  final String id;
  final String senderId;
  final String body;
  final bool system;
  final int createdAt; // epoch ms
  final int updatedAt; // epoch ms
  final bool mine;
  final bool edited;
  final bool deleted;
  final ReplyPreviewModel? replyTo;
  final ReactionSummary reactions;
  final ChatFileModel? file;

  /// Qabul qiluvchi o'qigan vaqt (epoch ms) — ✓✓ uchun.
  final int? readAt;

  const ChatMessageModel({
    required this.id,
    required this.senderId,
    required this.body,
    required this.system,
    required this.createdAt,
    required this.updatedAt,
    required this.mine,
    required this.edited,
    required this.deleted,
    this.replyTo,
    required this.reactions,
    this.file,
    this.readAt,
  });

  DateTime get createdAtDate => DateTime.fromMillisecondsSinceEpoch(createdAt);

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id'] as String,
      senderId: json['senderId'] as String,
      body: json['body'] as String? ?? '',
      system: json['system'] as bool? ?? false,
      createdAt: (json['createdAt'] as num).toInt(),
      updatedAt: (json['updatedAt'] as num).toInt(),
      mine: json['mine'] as bool? ?? false,
      edited: json['edited'] as bool? ?? false,
      deleted: json['deleted'] as bool? ?? false,
      replyTo: json['replyTo'] != null ? ReplyPreviewModel.fromJson(json['replyTo'] as Map<String, dynamic>) : null,
      reactions: json['reactions'] != null
          ? ReactionSummary.fromJson(json['reactions'] as Map<String, dynamic>)
          : const ReactionSummary(like: 0, dislike: 0),
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
  String get badge {
    if (contractStatus == 'SENT') return '📄 Shartnoma yuborilgan';
    if (cancelState == 'DISPUTED') return "⚖️ Admin ko'rib chiqmoqda";
    if (cancelState == 'PENDING') return "⚠️ Bekor qilish so'ralgan";
    return kOrderStatusLabel[status] ?? status;
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
