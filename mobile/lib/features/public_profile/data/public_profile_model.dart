class PublicOrderModel {
  final String id;
  final String title;
  final String type;
  final String status;
  final DateTime date;
  final int? reviewStars;
  final String? reviewComment;

  const PublicOrderModel({
    required this.id,
    required this.title,
    required this.type,
    required this.status,
    required this.date,
    this.reviewStars,
    this.reviewComment,
  });

  factory PublicOrderModel.fromJson(Map<String, dynamic> json) {
    return PublicOrderModel(
      id: json['id'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      date: DateTime.parse(json['date'] as String),
      reviewStars: (json['reviewStars'] as num?)?.toInt(),
      reviewComment: json['reviewComment'] as String?,
    );
  }
}

class MaskedEmailModel {
  final String visible;
  final int hiddenLen;
  final bool full;

  const MaskedEmailModel({required this.visible, required this.hiddenLen, required this.full});

  factory MaskedEmailModel.fromJson(Map<String, dynamic> json) {
    return MaskedEmailModel(
      visible: json['visible'] as String,
      hiddenLen: (json['hiddenLen'] as num).toInt(),
      full: json['full'] as bool,
    );
  }

  String get display => full ? visible : '$visible${'•' * hiddenLen}';
}

class PublicProfileModel {
  final String id;
  final String? name;
  final String? login;
  final String? role;
  final String? about;
  final String? image;
  final double? rating;
  final int ratingCount;
  final MaskedEmailModel? email;
  final DateTime createdAt;
  final bool online;
  final String presenceText;
  final int ordersCreated;
  final int ordersTaken;
  final List<PublicOrderModel> doneOrders;
  final bool blockedMe;

  const PublicProfileModel({
    required this.id,
    this.name,
    this.login,
    this.role,
    this.about,
    this.image,
    this.rating,
    required this.ratingCount,
    this.email,
    required this.createdAt,
    required this.online,
    required this.presenceText,
    required this.ordersCreated,
    required this.ordersTaken,
    required this.doneOrders,
    this.blockedMe = false,
  });

  bool get isPreparer => role == 'PREPARER';

  String get displayName {
    if ((name ?? '').isNotEmpty) return name!;
    if (login != null) return '@$login';
    return 'Foydalanuvchi';
  }

  factory PublicProfileModel.fromJson(Map<String, dynamic> json) {
    return PublicProfileModel(
      id: json['id'] as String,
      name: json['name'] as String?,
      login: json['login'] as String?,
      role: json['role'] as String?,
      about: json['about'] as String?,
      image: json['image'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      ratingCount: (json['ratingCount'] as num?)?.toInt() ?? 0,
      email: json['email'] != null ? MaskedEmailModel.fromJson(json['email'] as Map<String, dynamic>) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      online: json['online'] as bool? ?? false,
      presenceText: json['presenceText'] as String? ?? 'oflayn',
      ordersCreated: (json['ordersCreated'] as num?)?.toInt() ?? 0,
      ordersTaken: (json['ordersTaken'] as num?)?.toInt() ?? 0,
      doneOrders: (json['doneOrders'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map(PublicOrderModel.fromJson)
          .toList(),
      blockedMe: json['blockedMe'] == true,
    );
  }
}
