class UserModel {
  final String id;
  final String? login;
  final String? name;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? role; // "ORDERER" | "PREPARER"
  final String? about;
  final String? image;
  final int balance;
  final int starBalance;
  final String? walletCode;
  final double? rating;
  final int ratingCount;
  final bool needsOnboarding;
  final bool isAvailable;
  final String theme;

  /// Tug'ilgan sana — "YYYY-MM-DD" yoki null.
  final String? birthDate;

  const UserModel({
    required this.id,
    this.login,
    this.name,
    this.firstName,
    this.lastName,
    this.email,
    this.role,
    this.about,
    this.image,
    required this.balance,
    required this.starBalance,
    this.walletCode,
    this.rating,
    required this.ratingCount,
    this.needsOnboarding = false,
    this.isAvailable = true,
    this.theme = 'dark',
    this.birthDate,
  });

  bool get isPreparer => role == 'PREPARER';

  String get displayName {
    if (name != null && name!.trim().isNotEmpty) return name!;
    if (login != null) return '@$login';
    return 'Foydalanuvchi';
  }

  String get roleLabel =>
      isPreparer ? 'Tayyorlovchi' : 'Buyurtma beruvchi';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      login: json['login'] as String?,
      name: json['name'] as String?,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      email: json['email'] as String?,
      role: json['role'] as String?,
      about: json['about'] as String?,
      image: json['image'] as String?,
      balance: (json['balance'] as num?)?.toInt() ?? 0,
      starBalance: (json['starBalance'] as num?)?.toInt() ?? 0,
      walletCode: json['walletCode'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      ratingCount: (json['ratingCount'] as num?)?.toInt() ?? 0,
      needsOnboarding: json['needsOnboarding'] as bool? ?? false,
      isAvailable: json['isAvailable'] as bool? ?? true,
      theme: json['theme'] as String? ?? 'dark',
      birthDate: json['birthDate'] as String?,
    );
  }
}
