import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../network/api_client.dart';
import 'message_notifier.dart';

/// Firebase (FCM) push: ilova yopiq yoki fonda bo'lsa ham yangi xabar
/// Android tizimi orqali tepadan bildirishnoma bo'lib keladi ("tin" ovozi bilan).
///
/// - ilova yopiq/fonda — bildirishnomani Android o'zi ko'rsatadi;
/// - ilova ochiq — [MessageNotifier] orqali o'zimiz ko'rsatamiz
///   (ochiq turgan suhbatniki bundan mustasno);
/// - bosilganda — o'sha suhbat ochiladi.
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  bool _initialized = false;
  String? _token;
  StreamSubscription<String>? _refreshSub;

  /// FCM ishlayaptimi (token olindi) — ishlamasa ilova eski usulda (so'rov orqali) xabar beradi.
  bool get active => _token != null;

  Future<bool> _init() async {
    if (_initialized) return true;
    if (kIsWeb) return false;
    try {
      await Firebase.initializeApp().timeout(const Duration(seconds: 10));
      FirebaseMessaging.onMessage.listen(_onForeground);
      FirebaseMessaging.onMessageOpenedApp.listen((m) => MessageNotifier.instance.openFromData(m.data));
      // ilova bildirishnoma bosilib, yopiq holatdan ochilgan bo'lsa
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        Future.delayed(const Duration(seconds: 2), () => MessageNotifier.instance.openFromData(initial.data));
      }
      _initialized = true;
      return true;
    } catch (e) {
      debugPrint('Firebase ishga tushmadi: $e');
      return false;
    }
  }

  /// Tizimga kirgandan keyin: tokenni olib, serverga yozamiz.
  Future<void> register() async {
    if (!await _init()) return;
    try {
      final token = await FirebaseMessaging.instance.getToken().timeout(const Duration(seconds: 15));
      if (token == null) return;
      _token = token;
      await _send(token);
      _refreshSub ??= FirebaseMessaging.instance.onTokenRefresh.listen((t) {
        _token = t;
        _send(t);
      });
    } catch (e) {
      debugPrint('push token olinmadi: $e');
    }
  }

  Future<void> _send(String token) async {
    try {
      await ApiClient.instance.post('/mobile/push-token', data: {'token': token, 'platform': 'android'});
    } catch (_) {}
  }

  /// Tizimdan chiqishda — shu qurilmaga boshqa push kelmasin.
  Future<void> unregister() async {
    final token = _token;
    _token = null;
    if (token == null) return;
    try {
      await ApiClient.instance.delete('/mobile/push-token', data: {'token': token});
    } catch (_) {}
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {}
  }

  void _onForeground(RemoteMessage m) {
    final convId = m.data['conversationId'] as String?;
    if (convId == null) return;
    // ochiq turgan suhbatga kelgan bo'lsa — chat o'zi "tin" chaladi
    if (MessageNotifier.instance.activeConversationId == convId) return;
    MessageNotifier.instance.showRemote(
      conversationId: convId,
      title: m.notification?.title ?? (m.data['name'] as String? ?? 'Yangi xabar'),
      body: m.notification?.body ?? '',
      data: m.data,
    );
  }
}
