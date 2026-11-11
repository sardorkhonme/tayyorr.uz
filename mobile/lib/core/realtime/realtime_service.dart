import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../network/api_client.dart';

/// Server signali: "chat" | "wallet" | "order" (+ qisqa ma'lumot, masalan {c: suhbat ID}).
class RealtimeEvent {
  final String name;
  final Map<String, dynamic> data;
  const RealtimeEvent(this.name, this.data);
}

/// Real-time (Ably SSE) — saytdagi lib/use-realtime.ts bilan bir xil. Bazaga xabar/hamyon/buyurtma
/// yozilganda server foydalanuvchining kanaliga qisqa signal yuboradi; ilova shunda ma'lumotni darhol
/// so'raydi. Ulangan bo'lsa tez-tez so'rash shart emas — faqat siyrak ehtiyot tekshiruvi qoladi.
/// Ilova fonga o'tganda ulanish yopiladi (batareya va trafik), qaytganda qayta ulanadi.
class RealtimeService {
  RealtimeService._({this.tokenQuery, this.onlyChannel});
  static final instance = RealtimeService._();

  /// «Tayyorr's Family» oynasi uchun alohida, qisqa muddatli ulanish — faqat "family" kanali
  /// (oyna yopilganda [stop] qilinadi; Ably faqat ochiq turganlarga yetkazadi).
  factory RealtimeService.family() => RealtimeService._(tokenQuery: const {'family': '1'}, onlyChannel: 'family');

  /// Token so'roviga qo'shimcha parametrlar.
  final Map<String, dynamic>? tokenQuery;

  /// Faqat shu kanalga ulanish (null — token bergan barcha kanallar).
  final String? onlyChannel;

  static const _sseUrl = 'https://realtime.ably.io/sse';

  /// Ulangan bo'lsa — ehtiyot tekshiruvi oralig'i.
  static const safetyPoll = Duration(seconds: 60);

  final _events = StreamController<RealtimeEvent>.broadcast();
  Stream<RealtimeEvent> get events => _events.stream;

  /// true — ulanish bor (tez-tez so'rash shart emas).
  final connected = ValueNotifier<bool>(false);

  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 15),
    // SSE uzoq ochiq turadi; Ably har 15 s da "heartbeat" yuboradi
    receiveTimeout: const Duration(seconds: 60),
    responseType: ResponseType.stream,
  ));

  bool _running = false;
  bool _disabled = false;
  CancelToken? _cancel;
  Timer? _retryTimer;
  Timer? _renewTimer;
  int _retryMs = 2000;
  String? _lastEvent;
  int _gen = 0;

  /// Kirgandan keyin chaqiriladi.
  void start() {
    if (_running) return;
    _running = true;
    _disabled = false;
    _connect();
  }

  /// Chiqishda yoki ilova fonga o'tganda.
  void stop() {
    _running = false;
    _gen++;
    _cancel?.cancel();
    _cancel = null;
    _retryTimer?.cancel();
    _renewTimer?.cancel();
    connected.value = false;
  }

  void _reconnectLater() {
    if (!_running) return;
    _retryTimer?.cancel();
    _retryTimer = Timer(Duration(milliseconds: _retryMs), _connect);
    _retryMs = (_retryMs * 2).clamp(2000, 60000);
  }

  Future<void> _connect() async {
    if (!_running || _disabled) return;
    final gen = ++_gen;
    _cancel?.cancel();
    _renewTimer?.cancel();

    Map<String, dynamic> t;
    try {
      t = await ApiClient.instance.get('/mobile/realtime/token', query: tokenQuery);
    } catch (_) {
      if (gen != _gen) return;
      connected.value = false;
      return _reconnectLater();
    }
    if (gen != _gen) return;
    final token = t['token'];
    if (token is! String || token.isEmpty) {
      // 204 — serverda real-time sozlanmagan: ilova oddiy so'rab turish bilan ishlaydi
      _disabled = true;
      connected.value = false;
      return;
    }
    final channels = onlyChannel ?? (t['channels'] as List? ?? const []).join(',');
    final expires = (t['expires'] as num?)?.toInt() ?? DateTime.now().add(const Duration(hours: 1)).millisecondsSinceEpoch;

    final cancel = CancelToken();
    _cancel = cancel;
    // token tugashidan 5 daqiqa oldin yangisi bilan qayta ulanamiz
    final renewIn = Duration(milliseconds: (expires - DateTime.now().millisecondsSinceEpoch - 5 * 60 * 1000).clamp(60000, 3600000));
    _renewTimer = Timer(renewIn, _connect);

    try {
      final res = await _dio.get<ResponseBody>(
        _sseUrl,
        queryParameters: {
          'v': '1.2',
          'channels': channels,
          'accessToken': token,
          if (_lastEvent != null) 'lastEvent': _lastEvent,
        },
        options: Options(headers: {'Accept': 'text/event-stream'}),
        cancelToken: cancel,
      );
      if (gen != _gen) return;
      connected.value = true;
      _retryMs = 2000;

      String? id;
      final data = StringBuffer();
      await for (final line in res.data!.stream
          .cast<List<int>>()
          .transform(utf8.decoder)
          .transform(const LineSplitter())) {
        if (gen != _gen) return;
        if (line.isEmpty) {
          if (data.isNotEmpty) _dispatch(data.toString(), id);
          data.clear();
          id = null;
        } else if (line.startsWith('data:')) {
          if (data.isNotEmpty) data.write('\n');
          data.write(line.substring(5).trimLeft());
        } else if (line.startsWith('id:')) {
          id = line.substring(3).trim();
        }
      }
    } catch (_) {
      /* uzildi yoki bekor qilindi */
    }
    if (gen != _gen) return;
    connected.value = false;
    _reconnectLater();
  }

  void _dispatch(String raw, String? id) {
    if (id != null && id.isNotEmpty) _lastEvent = id;
    try {
      final m = jsonDecode(raw);
      if (m is! Map) return;
      var d = m['data'];
      if (d is String) d = d.isEmpty ? <String, dynamic>{} : jsonDecode(d);
      _events.add(RealtimeEvent('${m['name'] ?? ''}', d is Map ? Map<String, dynamic>.from(d) : const {}));
    } catch (_) {
      /* noto'g'ri xabar — e'tiborsiz */
    }
  }
}
