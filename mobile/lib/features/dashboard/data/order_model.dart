class OrderModel {
  final String id;
  final String title;
  final String description;
  final String type;
  final String status;
  final int? budget;
  final int offers;
  final DateTime createdAt;
  final String? ordererLabel;
  final bool deleted;
  final String? deleteReason;

  const OrderModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.status,
    this.budget,
    required this.offers,
    required this.createdAt,
    this.ordererLabel,
    required this.deleted,
    this.deleteReason,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      type: json['type'] as String,
      status: json['status'] as String,
      budget: (json['budget'] as num?)?.toInt(),
      offers: (json['offers'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      ordererLabel: json['ordererLabel'] as String?,
      deleted: json['deleted'] as bool? ?? false,
      deleteReason: json['deleteReason'] as String?,
    );
  }
}

const kOrderTypeLabel = {
  'PRESENTATION': 'Prezentatsiya',
  'COURSE_WORK': 'Kurs ishi',
  'REFERAT': 'Referat',
  'ESSAY': 'Esse',
  'DIPLOMA': 'Diplom ishi',
  'OTHER': 'Boshqa',
};

const kOrderStatusLabel = {
  'OPEN': 'Ochiq',
  'IN_PROGRESS': 'Jarayonda',
  'DELIVERED': 'Topshirilgan',
  'DONE': 'Yakunlangan',
  'CANCELLED': 'Bekor qilingan',
};
