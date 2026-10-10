import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:just_audio/just_audio.dart';

import '../../app.dart';
import '../../features/messages/data/message_model.dart';
import '../../features/messages/presentation/chat_screen.dart';

/// Yangi xabarlar uchun bildirishnoma va "tin" ovozi.
///
/// - Boshqa suhbatga xabar kelsa — tizim bildirishnomasi (o'z "tin" ovozi bilan).
/// - Ochiq turgan suhbatga xabar kelsa — faqat qisqa "tin" (bildirishnomasiz).
/// Bildirishnoma bosilsa — o'sha suhbat ochiladi.
class MessageNotifier {
  MessageNotifier._();
  static final MessageNotifier instance = MessageNotifier._();

  final _plugin = FlutterLocalNotificationsPlugin();
  AudioPlayer? _tin;
  bool _ready = false;
  DateTime _lastTin = DateTime.fromMillisecondsSinceEpoch(0);

  /// Hozir ekranda ochiq turgan suhbat id'si (ChatScreen o'rnatadi).
  String? activeConversationId;

  // Kanal id'si ovoz bilan bog'liq: ovoz o'zgarsa yangi id kerak (Android kanal sozlamasini eslab qoladi).
  static const _channel = AndroidNotificationChannel(
    'messages_tin_v1',
    'Yangi xabarlar',
    description: 'Chatdagi yangi xabarlar haqida bildirishnoma',
    importance: Importance.high,
    sound: RawResourceAndroidNotificationSound('tin'),
    playSound: true,
    enableVibration: true,
  );

  Future<void> init() async {
    if (_ready || kIsWeb) return;
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('ic_stat_message'),
        ),
        onDidReceiveNotificationResponse: (r) => _openFromPayload(r.payload),
      );
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);
      _ready = true;

      // ilova bildirishnoma bosilib ochilgan bo'lsa — o'sha suhbatga o'tamiz
      final launch = await _plugin.getNotificationAppLaunchDetails();
      if (launch?.didNotificationLaunchApp ?? false) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Future.delayed(const Duration(seconds: 2), () => _openFromPayload(launch!.notificationResponse?.payload));
        });
      }
    } catch (e) {
      debugPrint('bildirishnoma ishga tushmadi: $e');
    }
  }

  /// Android 13+ da ruxsat so'raydi (tizimga kirgandan keyin chaqiriladi).
  Future<void> requestPermission() async {
    if (kIsWeb) return;
    await init();
    try {
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    } catch (_) {}
  }

  /// Ochiq suhbat ichidagi qisqa "tin" (1.5 soniyada bir martadan ko'p emas).
  Future<void> playTin() async {
    final now = DateTime.now();
    if (now.difference(_lastTin) < const Duration(milliseconds: 1500)) return;
    _lastTin = now;
    try {
      final p = _tin ??= AudioPlayer()..setAsset('assets/sounds/tin.wav');
      await p.seek(Duration.zero);
      await p.setVolume(0.7);
      await p.play();
    } catch (_) {}
  }

  /// Yangi xabar(lar) haqida bildirishnoma — har suhbat uchun bitta (yangilanib turadi).
  Future<void> showMessage(ConversationModel c) async {
    if (kIsWeb) return;
    await init();
    if (!_ready) return;
    final body = (c.lastMessageBody ?? '').trim().isEmpty ? '📎 Fayl' : c.lastMessageBody!.trim();
    final title = c.unread > 1 ? '${c.other.name} (${c.unread})' : c.other.name;
    try {
      await _plugin.show(
        id: c.id.hashCode & 0x7fffffff,
        title: title,
        body: body,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _channel.id,
            _channel.name,
            channelDescription: _channel.description,
            importance: Importance.high,
            priority: Priority.high,
            sound: _channel.sound,
            color: const Color(0xFF6366F1),
            category: AndroidNotificationCategory.message,
            styleInformation: BigTextStyleInformation(body),
          ),
        ),
        payload: jsonEncode({
          'id': c.id,
          'otherId': c.other.id,
          'name': c.other.name,
          'login': c.other.login,
          'image': c.other.image,
          'support': c.other.isSupport,
        }),
      );
    } catch (e) {
      debugPrint('bildirishnoma ko\'rsatilmadi: $e');
    }
  }

  /// Suhbat ochilganda — uning bildirishnomasini olib tashlaymiz.
  Future<void> clearFor(String conversationId) async {
    if (kIsWeb || !_ready) return;
    try {
      await _plugin.cancel(id: conversationId.hashCode & 0x7fffffff);
    } catch (_) {}
  }

  void _openFromPayload(String? payload) {
    if (payload == null) return;
    try {
      final d = jsonDecode(payload) as Map<String, dynamic>;
      final id = d['id'] as String;
      if (activeConversationId == id) return;
      navigatorKey.currentState?.push(MaterialPageRoute(
        builder: (_) => ChatScreen(
          conversationId: id,
          other: ChatOtherUser(
            id: d['otherId'] as String,
            name: d['name'] as String? ?? '',
            login: d['login'] as String?,
            image: d['image'] as String?,
            isSupport: d['support'] == true,
          ),
        ),
      ));
    } catch (_) {}
  }
}
