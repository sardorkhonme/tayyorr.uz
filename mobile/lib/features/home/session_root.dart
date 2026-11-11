import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/app_config.dart';
import '../../core/notifications/message_notifier.dart';
import '../../core/notifications/push_service.dart';
import '../../core/realtime/realtime_service.dart';
import '../../core/storage/local_storage.dart';
import '../../core/ui/app_dialogs.dart';
import '../../core/unread_counter.dart';
import '../auth/bloc/auth_bloc.dart';
import '../plus/plus_home_screen.dart';

/// Kirgandan keyingi ildiz: butun ilova bo'yicha fon ishlari (real-time, o'qilmaganlar, bildirishnomalar,
/// fondan qaytganda yangilash) shu yerda — bosh sahifa (tayyorr+) va undan ochiladigan xizmatlar ustida.
class SessionRoot extends StatefulWidget {
  const SessionRoot({super.key});

  @override
  State<SessionRoot> createState() => _SessionRootState();
}

class _SessionRootState extends State<SessionRoot> with WidgetsBindingObserver {
  Timer? _unreadTimer;
  StreamSubscription<RealtimeEvent>? _rtSub;
  Timer? _chatDebounce;
  DateTime _lastUnread = DateTime.fromMillisecondsSinceEpoch(0);
  bool _foreground = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    UnreadCounter.instance.reset();
    _refreshUnread();
    // Real-time: server signal yuboradi — ma'lumot faqat o'zgarganda so'raladi
    RealtimeService.instance.start();
    _rtSub = RealtimeService.instance.events.listen(_onRealtime);
    // ehtiyot tekshiruvi: ulangan bo'lsa daqiqada bir, ulanmagan bo'lsa 15 s da bir;
    // fonda — faqat push ishlamasa va daqiqada bir (bildirishnoma uchun)
    _unreadTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      final every = !_foreground
          ? (PushService.instance.active ? null : const Duration(seconds: 60))
          : RealtimeService.instance.connected.value
              ? RealtimeService.safetyPoll
              : const Duration(seconds: 15);
      if (every != null && DateTime.now().difference(_lastUnread) >= every) _refreshUnread();
    });
    // bildirişnoma ruxsati — avval chiroyli tushuntirish oynasi (bir marta; "Keyinroq" — 3 kundan keyin yana)
    WidgetsBinding.instance.addPostFrameCallback((_) => _askNotifications());
  }

  void _refreshUnread() {
    _lastUnread = DateTime.now();
    UnreadCounter.instance.refresh();
  }

  void _onRealtime(RealtimeEvent e) {
    if (e.name == 'chat') {
      // bir nechta signal ketma-ket kelsa — bitta so'rov
      _chatDebounce?.cancel();
      _chatDebounce = Timer(const Duration(milliseconds: 400), _refreshUnread);
    } else if (e.name == 'wallet' && mounted) {
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
    }
  }

  @override
  void dispose() {
    _unreadTimer?.cancel();
    _chatDebounce?.cancel();
    _rtSub?.cancel();
    RealtimeService.instance.stop();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _foreground = true;
      RealtimeService.instance.start();
      // Foydalanuvchi tashqi brauzerda to'lov qilib qaytganda (Click) —
      // balansni darhol yangilaymiz.
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      _refreshUnread();
      // yangilanish / narxlar
      AppConfig.instance.load();
    } else if (state == AppLifecycleState.paused) {
      _foreground = false;
      RealtimeService.instance.stop();
    }
  }

  Future<void> _askNotifications() async {
    if (!mounted) return;
    final st = LocalStorage.instance;
    final granted = await MessageNotifier.instance.isPermissionGranted();
    if (granted) {
      PushService.instance.register();
      return;
    }
    final snoozed = st.notifPromptAt;
    if (snoozed != null && DateTime.now().difference(snoozed) < const Duration(days: 3)) return;
    if (!mounted) return;
    final ok = await showPermissionPrompt(
      context,
      icon: Icons.notifications_active_rounded,
      title: 'Bildirişnomalarni yoqasizmi?',
      message: "Muhim narsalarni ötkazib yubormang — ilova yopiq bölsa ham xabar beramiz.",
      points: const ['Yangi xabar va javoblar', 'Şartnoma va buyurtma holati', 'Hamyonga pul tuşganda'],
      allowLabel: 'Yoqiş',
    );
    await st.setNotifPromptAt(DateTime.now());
    if (ok) {
      await MessageNotifier.instance.requestPermission();
      PushService.instance.register();
    }
  }

  @override
  Widget build(BuildContext context) => const PlusHomeScreen();
}
