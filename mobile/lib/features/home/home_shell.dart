import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/navigation/services.dart';
import '../../core/ui/gradient_bottom_bar.dart';
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

/// Tayyorr.uz xizmati (ilmiy ishlar) — tayyorr+ bosh sahifasidan ochiladi.
/// Pastki panel: Asosiy, (tayyorlovchida) Takliflarim, Xabarlar, Hamyon, Profil.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    return ServiceScope(
      kind: ServiceKind.uz,
      child: BlocProvider.value(
        value: SectionCubit.instance,
        child: const _HomeShellView(),
      ),
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

class _HomeShellView extends StatelessWidget {
  const _HomeShellView();

  @override
  Widget build(BuildContext context) {
    final isPreparer = context.select<AuthBloc, bool>((b) => b.state.user?.isPreparer ?? false);
    final bar = <AppSection>[
      AppSection.dashboard,
      if (isPreparer) AppSection.offers,
      AppSection.messages,
      AppSection.wallet,
      AppSection.profile,
    ];
    return BlocBuilder<SectionCubit, AppSection>(
      builder: (context, section) {
        return PopScope(
          // ichki bo'limda "orqaga" — avval Asosiy bo'limga, keyin tayyorr+ ga
          canPop: section == AppSection.dashboard,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) SectionCubit.instance.select(AppSection.dashboard);
          },
          child: AuroraBackground(
            child: Scaffold(
              backgroundColor: Colors.transparent,
              extendBody: true,
              body: _SectionFade(
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
              bottomNavigationBar: ValueListenableBuilder<int>(
                valueListenable: UnreadCounter.instance,
                builder: (context, unread, _) => GradientBottomBar(
                  index: bar.indexOf(section),
                  onTap: (i) => SectionCubit.instance.select(bar[i]),
                  items: [
                    for (final s in bar) _item(s, unread),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  BottomBarItem _item(AppSection s, int unread) => switch (s) {
        AppSection.dashboard => const BottomBarItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Asosiy'),
        AppSection.offers => const BottomBarItem(icon: Icons.back_hand_outlined, activeIcon: Icons.back_hand_rounded, label: 'Takliflarim'),
        AppSection.messages =>
          BottomBarItem(icon: Icons.chat_bubble_outline_rounded, activeIcon: Icons.chat_bubble_rounded, label: 'Xabarlar', badge: unread),
        AppSection.wallet =>
          const BottomBarItem(icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet_rounded, label: 'Hamyon'),
        AppSection.profile => const BottomBarItem(icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: 'Profil'),
        AppSection.referral => const BottomBarItem(icon: Icons.card_giftcard_outlined, activeIcon: Icons.card_giftcard_rounded, label: 'Referal'),
      };
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
