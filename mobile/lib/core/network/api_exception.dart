import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart' show PlatformException;

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

/// Har qanday xatoni foydalanuvçiga tuşunarli matnga aylantiradi (heç qaçon böş emas).
/// ApiException — server matni; vaqt tugaşi / internet — tegişli matn; qolgani — umumiy matn.
String friendlyError(Object? e, {String? fallback}) {
  final fb = fallback ?? 'Nimadir xato ketdi — qayta urinib köring';
  return switch (e) {
    final ApiException x when x.message.trim().isNotEmpty => x.message,
    TimeoutException() => ApiException.slowMessage,
    SocketException() || HttpException() => ApiException.offlineMessage,
    final PlatformException x when x.code == 'network_error' =>
      ApiException.offlineMessage,
    final String m when m.trim().isNotEmpty => m,
    _ => fb,
  };
}
