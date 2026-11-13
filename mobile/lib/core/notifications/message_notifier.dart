import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';

import '../../app.dart';
import '../../features/family/family_entry.dart';
import '../../features/family/family_repository.dart';
import '../../features/family/family_screen.dart';
import '../../features/messages/data/message_model.dart';
import '../../features/messages/data/messages_repository.dart';
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
    description: 'Çatdagi yangi xabarlar haqida bildirişnoma',
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
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(_channel);
      _ready = true;

      // ilova bildirishnoma bosilib ochilgan bo'lsa — o'sha suhbatga o'tamiz
      final launch = await _plugin.getNotificationAppLaunchDetails();
      if (launch?.didNotificationLaunchApp ?? false) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Future.delayed(
            const Duration(seconds: 2),
            () => _openFromPayload(launch!.notificationResponse?.payload),
          );
        });
      }
    } catch (e) {
      debugPrint('bildirişnoma işga tuşmadi: $e');
    }
  }

  /// Ruxsat allaqachon berilganmi (Android 13 dan eski — doim true).
  Future<bool> isPermissionGranted() async {
    if (kIsWeb) return true;
    await init();
    try {
      final r = await _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.areNotificationsEnabled();
      return r ?? true;
    } catch (_) {
      return true;
    }
  }

  /// Android 13+ da ruxsat so'raydi (tizimga kirgandan keyin chaqiriladi).
  Future<void> requestPermission() async {
    if (kIsWeb) return;
    await init();
    try {
      await _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.requestNotificationsPermission();
    } catch (_) {}
  }

  /// Ochiq suhbat ichidagi qisqa "tin" (1.5 soniyada bir martadan ko'p emas).
  Future<void> playTin() async {
    final now = DateTime.now();
    if (now.difference(_lastTin) < const Duration(milliseconds: 1500)) return;
    _lastTin = now;
    try {
      final p = _tin ??= _systemPlayer('assets/sounds/tin.wav');
      await p.seek(Duration.zero);
      await p.setVolume(0.7);
      await p.play();
    } catch (_) {}
  }

  AudioPlayer? _send;
  DateTime _lastSend = DateTime.fromMillisecondsSinceEpoch(0);

  /// Tizim ovozi sifatida chalinadigan pleyer (media emas): Android'da «tizim» ovoz balandligiga
  /// bo'ysunadi, jim/tebranish rejimida eshitilmaydi, musiqani to'xtatmaydi (audio focus olmaydi).
  AudioPlayer _systemPlayer(String asset, {bool media = false}) {
    final p = AudioPlayer(
      handleInterruptions: false,
      androidApplyAudioAttributes: false,
      handleAudioSessionActivation: false,
    );
    p.setAndroidAudioAttributes(media
        // fayl qanday bölsa şunday (töliq çastota, odatiy balandlik) — tizim kanali ovozni ingiçkalaştiradi
        ? const AndroidAudioAttributes(contentType: AndroidAudioContentType.music, usage: AndroidAudioUsage.media)
        : const AndroidAudioAttributes(
            contentType: AndroidAudioContentType.sonification,
            usage: AndroidAudioUsage.assistanceSonification,
          ));
    p.setAsset(asset);
    return p;
  }

  /// Telegramdagidek qisqa «pik» — o'z xabarim yuborilganda (server qabul qilganda).
  /// Kutilmaydi (UI to'xtamaydi); tizim ovozi — jim rejimda eshitilmaydi.
  void playSent() {
    final now = DateTime.now();
    if (now.difference(_lastSend) < const Duration(milliseconds: 250)) return;
    _lastSend = now;
    () async {
      try {
        final p = _send ??= _systemPlayer('assets/sounds/send.mp3', media: true);
        await p.seek(Duration.zero);
        await p.setVolume(1.0);
        await p.play();
      } catch (_) {}
    }();
  }

  /// Yangi xabar(lar) haqida bildirishnoma — har suhbat uchun bitta (yangilanib turadi).
  Future<void> showMessage(ConversationModel c) async {
    if (kIsWeb) return;
    await init();
    if (!_ready) return;
    final body = (c.lastMessageBody ?? '').trim().isEmpty
        ? '📎 Fayl'
        : c.lastMessageBody!.trim();
    final title = c.unread > 1 ? '${c.other.name} (${c.unread})' : c.other.name;
    try {
      await _plugin.show(
        id: c.id.hashCode & 0x7fffffff,
        title: title,
        body: body,
        notificationDetails: _details(body),
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
      debugPrint('bildirişnoma körsatilmadi: $e');
    }
  }

  /// Qayta kirgandan keyin (çiqib-kirganda): öqilmagan xabarlar — fonda kelgandek tizim bildirişnomasi
  /// (suhbatlar, support, Family). Ruxsat bölmasa — heç narsa; tizimda allaqaçon turgani
  /// (push körsatgan) — takrorlanmaydi.
  Future<void> notifyUnreadAfterLogin() async {
    if (kIsWeb) return;
    if (!await isPermissionGranted()) return;
    if (!_ready) return;
    final ids = <int>{};
    final tags = <String>{};
    var familyShown = false;
    try {
      for (final a in await _plugin.getActiveNotifications()) {
        if (a.id != null) ids.add(a.id!);
        final t = a.tag;
        if (t != null) tags.add(t);
        if ((t ?? '').startsWith('family') ||
            (a.payload ?? '').contains('"family":true')) {
          familyShown = true;
        }
      }
    } catch (_) {}
    try {
      final list = await MessagesRepository().fetchConversations();
      for (final c in list) {
        if (c.unread <= 0 ||
            c.lastMessageMine == true ||
            activeConversationId == c.id ||
            ids.contains(c.id.hashCode & 0x7fffffff) ||
            tags.contains(c.id)) {
          continue;
        }
        await showMessage(c);
      }
    } catch (_) {}
    try {
      final fs = FamilySummary.instance;
      await fs.refresh(force: true);
      final v = fs.value.value;
      if (familyShown ||
          FamilyScreen.isOpen ||
          (v.unread <= 0 && v.mentions <= 0)) {
        return;
      }
      final body = v.mentions > 0
          ? (v.mentions == 1
                ? 'Sizni belgilaşdi'
                : 'Sizni belgilaşdi · ${v.mentions} ta')
          : '${v.unread >= 99 ? '99+' : v.unread} ta yangi xabar';
      await _plugin.show(
        id: 'family-unread'.hashCode & 0x7fffffff,
        title: kFamilyName,
        body: body,
        notificationDetails: _details(body, scope: 'plus'),
        payload: jsonEncode({'family': true}),
      );
    } catch (e) {
      debugPrint('bildirişnoma körsatilmadi: $e');
    }
  }

  /// Suhbat ochilganda — uning bildirishnomasini olib tashlaymiz.
  Future<void> clearFor(String conversationId) async {
    if (kIsWeb || !_ready) return;
    try {
      await _plugin.cancel(id: conversationId.hashCode & 0x7fffffff);
      // FCM (ilova yopiq paytda) kelganlari — tag = suhbat id'si, id = 0
      await _plugin.cancel(id: 0, tag: conversationId);
    } catch (_) {}
  }

  /// Push (FCM) orqali kelgan xabar — ilova ochiq paytda ko'rsatish.
  Future<void> showRemote({
    required String conversationId,
    required String title,
    required String body,
    required Map<String, dynamic> data,
  }) async {
    if (kIsWeb) return;
    await init();
    if (!_ready) return;
    try {
      await _plugin.show(
        id: conversationId.hashCode & 0x7fffffff,
        title: title,
        body: body,
        notificationDetails: _details(body, scope: _scope(data['scope'])),
        payload: jsonEncode({
          'id': conversationId,
          'scope': _scope(data['scope']),
          'otherId': data['otherId'],
          'name': data['name'] ?? title,
          'login': data['login'],
          'image': data['image'],
          'support': data['support'] == '1',
        }),
      );
    } catch (e) {
      debugPrint('bildirişnoma körsatilmadi: $e');
    }
  }

  /// «Tayyorr's Family» guruhidan (belgilash, javob, «hammaga bildirish», qadash) — ilova ochiq paytda.
  Future<void> showFamily({
    required String messageId,
    required String title,
    required String body,
  }) async {
    if (kIsWeb) return;
    await init();
    if (!_ready) return;
    try {
      await _plugin.show(
        id: ('family-$messageId').hashCode & 0x7fffffff,
        title: title,
        body: body,
        notificationDetails: _details(body, scope: 'plus'),
        payload: jsonEncode({'family': true}),
      );
    } catch (e) {
      debugPrint('bildirişnoma körsatilmadi: $e');
    }
  }

  /// FCM bildirishnomasi bosilganda (data maydonlari bilan).
  void openFromData(Map<String, dynamic> data) {
    if (data['type'] == 'family') {
      openFamily();
      return;
    }
    final id = data['conversationId'] as String?;
    if (id == null) return;
    _openFromPayload(
      jsonEncode({
        'id': id,
        'scope': _scope(data['scope']),
        'otherId': data['otherId'] ?? '',
        'name': data['name'] ?? '',
        'login': data['login'],
        'image': data['image'],
        'support': data['support'] == '1',
      }),
    );
  }

  /// Xizmat: 'uz' (Tayyorr.uz), 'plus' (tayyorr+), 'smm' — bildirishnoma belgisi va qaysi bo'limda ochish.
  static String _scope(Object? v) =>
      v == 'family' ? 'plus' : (v == 'plus' || v == 'smm' ? v as String : 'uz');

  NotificationDetails _details(String body, {String scope = 'uz'}) =>
      NotificationDetails(
        android: AndroidNotificationDetails(
          // har xizmatning o'z belgisi (katta ikonka)
          largeIcon: DrawableResourceAndroidBitmap('notif_$scope'),
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
      );

  void _openFromPayload(String? payload) {
    if (payload == null) return;
    try {
      final d = jsonDecode(payload) as Map<String, dynamic>;
      if (d['family'] == true) {
        openFamily();
        return;
      }
      final id = d['id'] as String;
      if (activeConversationId == id) return;
      navigatorKey.currentState?.push(
        MaterialPageRoute(
          builder: (_) => ChatScreen(
            conversationId: id,
            scope: d['scope'] as String? ?? 'uz',
            other: ChatOtherUser(
              id: d['otherId'] as String,
              name: d['name'] as String? ?? '',
              login: (d['login'] as String?)?.isEmpty ?? true
                  ? null
                  : d['login'] as String?,
              image: (d['image'] as String?)?.isEmpty ?? true
                  ? null
                  : d['image'] as String?,
              isSupport: d['support'] == true,
            ),
          ),
        ),
      );
    } catch (_) {}
  }
}
