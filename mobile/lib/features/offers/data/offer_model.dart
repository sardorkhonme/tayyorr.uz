class OfferOrderModel {
  final String id;
  final String title;
  final String type;
  final String status;
  final int? budget;
  final bool deleted;

  const OfferOrderModel({
    required this.id,
    required this.title,
    required this.type,
    required this.status,
    this.budget,
    required this.deleted,
  });

  factory OfferOrderModel.fromJson(Map<String, dynamic> json) {
    return OfferOrderModel(
      id: json['id'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      budget: (json['budget'] as num?)?.toInt(),
      deleted: json['deleted'] as bool? ?? false,
    );
  }
}

class OfferModel {
  final String id;
  final int price;
  final String? message;
  final String status; // PENDING | ACCEPTED | REJECTED | WITHDRAWN
  final int starsSpent;
  final DateTime createdAt;
  final OfferOrderModel order;

  const OfferModel({
    required this.id,
    required this.price,
    this.message,
    required this.status,
    this.starsSpent = 2,
    required this.createdAt,
    required this.order,
  });

  factory OfferModel.fromJson(Map<String, dynamic> json) {
    return OfferModel(
      id: json['id'] as String,
      price: (json['price'] as num).toInt(),
      message: json['message'] as String?,
      status: json['status'] as String,
      starsSpent: (json['starsSpent'] as num?)?.toInt() ?? 2,
      createdAt: DateTime.parse(json['createdAt'] as String),
      order: OfferOrderModel.fromJson(json['order'] as Map<String, dynamic>),
    );
  }
}

const kOfferStatusLabel = {
  'PENDING': "Ko'rib chiqilmoqda",
  'ACCEPTED': 'Qabul qilindi',
  'REJECTED': 'Rad etildi',
  'WITHDRAWN': 'Qaytarib olindi',
};
