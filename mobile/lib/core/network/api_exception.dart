class ApiException implements Exception {
  final String message;
  final int? statusCode;

  /// Server: foydalanuvchi cheklangan (403, `restricted: true`) — matn [message] da.
  final bool restricted;

  ApiException(this.message, {this.statusCode, this.restricted = false});

  @override
  String toString() => message;
}
