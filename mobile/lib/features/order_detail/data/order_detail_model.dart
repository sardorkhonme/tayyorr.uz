class OrderPartyModel {
  final String id;
  final String? name;
  final String? login;
  final String? image;
  final bool online;
  final String? presence;

  const OrderPartyModel({required this.id, this.name, this.login, this.image, this.online = false, this.presence});

  factory OrderPartyModel.fromJson(Map<String, dynamic> json) {
    final p = json['presence'] as Map<String, dynamic>?;
    return OrderPartyModel(
      id: json['id'] as String,
      name: json['name'] as String?,
      login: json['login'] as String?,
      image: (json['avatarUrl'] as String?) ?? (json['image'] as String?),
      online: p?['online'] as bool? ?? false,
      presence: p?['text'] as String?,
    );
  }

  String get displayName {
    if ((name ?? '').isNotEmpty) return name!;
    if (login != null) return '@$login';
    return 'Foydalanuvchi';
  }
}

class OrderOfferModel {
  final String id;
  final int price;
  final String? message;
  final String status;
  final int starsSpent;
  final DateTime createdAt;
  final OrderPartyModel preparer;
  final bool preparerAvailable;
  final double? preparerRating;
  final int preparerRatingCount;
  final String? preparerAbout;

  const OrderOfferModel({
    required this.id,
    required this.price,
    this.message,
    required this.status,
    required this.starsSpent,
    required this.createdAt,
    required this.preparer,
    required this.preparerAvailable,
    this.preparerRating,
    required this.preparerRatingCount,
    this.preparerAbout,
  });

  factory OrderOfferModel.fromJson(Map<String, dynamic> json) {
    final p = json['preparer'] as Map<String, dynamic>;
    return OrderOfferModel(
      id: json['id'] as String,
      price: (json['price'] as num).toInt(),
      message: json['message'] as String?,
      status: json['status'] as String,
      starsSpent: (json['starsSpent'] as num?)?.toInt() ?? 2,
      createdAt: DateTime.parse(json['createdAt'] as String),
      preparer: OrderPartyModel(id: p['id'] as String, name: p['name'] as String?, login: p['login'] as String?, image: p['image'] as String?),
      preparerAvailable: p['isAvailable'] as bool? ?? true,
      preparerRating: (p['rating'] as num?)?.toDouble(),
      preparerRatingCount: (p['ratingCount'] as num?)?.toInt() ?? 0,
      preparerAbout: p['about'] as String?,
    );
  }
}

class OfferQueueEntry {
  final int position;
  final bool mine;
  final int starsSpent;
  final String visible;
  final int hiddenLen;

  const OfferQueueEntry({
    required this.position,
    required this.mine,
    required this.starsSpent,
    required this.visible,
    required this.hiddenLen,
  });

  String get maskedName => hiddenLen > 0 ? '$visible${'•' * hiddenLen.clamp(0, 14)}' : visible;

  factory OfferQueueEntry.fromJson(Map<String, dynamic> json) {
    return OfferQueueEntry(
      position: (json['position'] as num).toInt(),
      mine: json['mine'] as bool,
      starsSpent: (json['starsSpent'] as num).toInt(),
      visible: json['visible'] as String,
      hiddenLen: (json['hiddenLen'] as num).toInt(),
    );
  }
}

class ContractModel {
  final String id;
  final String status;
  final int amount;
  final String? note;
  final DateTime? deadline;
  final String preparerId;
  final String preparerName;
  final DateTime createdAt;

  const ContractModel({
    required this.id,
    required this.status,
    required this.amount,
    this.note,
    this.deadline,
    required this.preparerId,
    required this.preparerName,
    required this.createdAt,
  });

  factory ContractModel.fromJson(Map<String, dynamic> json) {
    return ContractModel(
      id: json['id'] as String,
      status: json['status'] as String,
      amount: (json['amount'] as num).toInt(),
      note: json['note'] as String?,
      deadline: json['deadline'] != null ? DateTime.parse(json['deadline'] as String) : null,
      preparerId: json['preparerId'] as String,
      preparerName: json['preparerName'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class OrderReviewModel {
  final int stars;
  final String? comment;

  const OrderReviewModel({required this.stars, this.comment});

  factory OrderReviewModel.fromJson(Map<String, dynamic> json) {
    return OrderReviewModel(stars: (json['stars'] as num).toInt(), comment: json['comment'] as String?);
  }
}

class OrderDetailModel {
  final String id;
  final String title;
  final String description;
  final String type;
  final String status;
  final int? budget;
  final DateTime? deadline;
  final DateTime createdAt;
  final bool deleted;
  final OrderPartyModel orderer;
  final OrderPartyModel? preparer;
  final List<OrderOfferModel> offers;
  final List<OfferQueueEntry> queue;
  final List<ContractModel> contracts;
  final OrderReviewModel? review;
  final DateTime? deletedAt;
  final String? deletedByRole;
  final String? deleteReason;
  final List<OrderFileModel> files;

  const OrderDetailModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.status,
    this.budget,
    this.deadline,
    required this.createdAt,
    required this.deleted,
    required this.orderer,
    this.preparer,
    required this.offers,
    this.queue = const [],
    this.contracts = const [],
    this.review,
    this.deletedAt,
    this.deletedByRole,
    this.deleteReason,
    this.files = const [],
  });

  /// Shartnoma DB'da "ACCEPTED" holatida qolib ketaveradi hatto ish
  /// yakunlangandan (DONE) keyin ham — shuning uchun bu yerda buyurtma
  /// holati ham tekshiriladi, aks holda tugagan ishga ham "bekor qilish"
  /// tugmasi ko'rsatilib qolardi.
  ContractModel? get activeContract {
    if (status != 'OPEN' && status != 'IN_PROGRESS' && status != 'DELIVERED') return null;
    for (final c in contracts) {
      if (c.status == 'SENT' || c.status == 'ACCEPTED') return c;
    }
    return null;
  }

  factory OrderDetailModel.fromJson(Map<String, dynamic> json) {
    return OrderDetailModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      type: json['type'] as String,
      status: json['status'] as String,
      budget: (json['budget'] as num?)?.toInt(),
      deadline: json['deadline'] != null ? DateTime.parse(json['deadline'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      deleted: json['deletedAt'] != null,
      orderer: OrderPartyModel.fromJson(json['orderer'] as Map<String, dynamic>),
      preparer: json['preparer'] != null ? OrderPartyModel.fromJson(json['preparer'] as Map<String, dynamic>) : null,
      offers: (json['offers'] as List).cast<Map<String, dynamic>>().map(OrderOfferModel.fromJson).toList(),
      queue: (json['queue'] as List? ?? []).cast<Map<String, dynamic>>().map(OfferQueueEntry.fromJson).toList(),
      contracts: (json['contracts'] as List? ?? []).cast<Map<String, dynamic>>().map(ContractModel.fromJson).toList(),
      review: json['review'] != null ? OrderReviewModel.fromJson(json['review'] as Map<String, dynamic>) : null,
      deletedAt: json['deletedAt'] != null ? DateTime.parse(json['deletedAt'] as String) : null,
      deletedByRole: json['deletedByRole'] as String?,
      deleteReason: json['deleteReason'] as String?,
      files: (json['files'] as List? ?? []).cast<Map<String, dynamic>>().map(OrderFileModel.fromJson).toList(),
    );
  }
}

class OrderFileModel {
  const OrderFileModel({required this.id, required this.kind, required this.size, this.url});
  final String id;
  final String kind;
  final int size;
  final String? url;

  factory OrderFileModel.fromJson(Map<String, dynamic> json) => OrderFileModel(
        id: json['id'] as String,
        kind: json['kind'] as String,
        size: (json['size'] as num).toInt(),
        url: json['url'] as String?,
      );
}
