import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/notifications/message_notifier.dart';
import '../../core/notifications/push_service.dart';
import '../../core/unread_counter.dart';
import '../../widgets/aurora_background.dart';
import '../auth/bloc/auth_bloc.dart';
import '../dashboard/presentation/dashboard_screen.dart';
import '../messages/presentation/messages_list_screen.dart';
import '../offers/presentation/offers_screen.dart';
import '../profile/presentation/profile_screen.dart';
import '../referral/presentation/referral_screen.dart';
import '../wallet/presentation/wallet_screen.dart';
import 'section_cubit.dart';

/// Saytda bo'lgani kabi — pastki navbar yo'q, bo'limlar orasida
/// headerdagi menyu tugmasi ochadigan panel orqali o'tiladi.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: SectionCubit.instance,
      child: const _HomeShellView(),
    );
  }
}

const _sectionOrder = [
  AppSection.dashboard,
  AppSection.offers,
  AppSection.referral,
  AppSection.messages,
  AppSection.wallet,
  AppSection.profile,
];

class _HomeShellView extends StatefulWidget {
  const _HomeShellView();

  @override
  State<_HomeShellView> createState() => _HomeShellViewState();
}

class _HomeShellViewState extends State<_HomeShellView> with WidgetsBindingObserver {
  Timer? _unreadTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    UnreadCounter.instance.reset();
    UnreadCounter.instance.refresh();
    // har 10 soniyada — yangi xabar kelsa bildirishnoma va "tin"
    _unreadTimer = Timer.periodic(const Duration(seconds: 10), (_) => UnreadCounter.instance.refresh());
    MessageNotifier.instance.requestPermission().then((_) => PushService.instance.register());
  }

  @override
  void dispose() {
    _unreadTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Foydalanuvchi tashqi brauzerda to'lov qilib qaytganda (Click) —
    // balansni darhol yangilaymiz.
    if (state == AppLifecycleState.resumed) {
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      UnreadCounter.instance.refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SectionCubit, AppSection>(
      builder: (context, section) {
        return AuroraBackground(
          child: _SectionFade(
            sectionKey: section,
            child: IndexedStack(
              index: _sectionOrder.indexOf(section),
              children: const [
                DashboardScreen(),
                OffersScreen(),
                ReferralScreen(),
                MessagesListScreen(),
                WalletScreen(),
                ProfileScreen(),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Bo'lim almashganda IndexedStack'ning barcha bolalari (va ularning
/// holati) saqlanib qoladi — faqat tashqi qatlam tez (180ms) xira bo'lib
/// yangi bo'limga o'tadi, sekin sahifa almashinuvi his qilinmaydi.
class _SectionFade extends StatefulWidget {
  const _SectionFade({required this.sectionKey, required this.child});

  final AppSection sectionKey;
  final Widget child;

  @override
  State<_SectionFade> createState() => _SectionFadeState();
}

class _SectionFadeState extends State<_SectionFade> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 180),
      value: 1,
    );
  }

  @override
  void didUpdateWidget(covariant _SectionFade oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.sectionKey != widget.sectionKey) {
      _controller
        ..value = 0
        ..forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: CurvedAnimation(parent: _controller, curve: Curves.easeOut),
      child: widget.child,
    );
  }
}
