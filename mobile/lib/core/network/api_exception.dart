class ApiException implements Exception {
  final String message;
  final int? statusCode;

  /// Server: foydalanuvchi cheklangan (403, `restricted: true`) — matn [message] da.
  final bool restricted;

  /// Serverga umuman yetib bormadi (internet yöq, ulanib bölmadi yoki vaqt tugadi).
  final bool network;

  ApiException(
    this.message, {
    this.statusCode,
    this.restricted = false,
    this.network = false,
  });

  /// Internetga ulanib bölmaganda (javob yöq) qaytariladigan matnlar.
  static const offlineMessage = 'Internetga ulanib bölmadi';
  static const slowMessage = 'Internet sekin — qayta urinib köring';

  /// Cubitlar xatoni faqat matn sifatida saqlaydi — shu matn tarmoq xatosimi.
  static bool isNetworkMessage(String? m) =>
      m == offlineMessage || m == slowMessage;

  bool get notFound => statusCode == 404;

  @override
  String toString() => message;
}
