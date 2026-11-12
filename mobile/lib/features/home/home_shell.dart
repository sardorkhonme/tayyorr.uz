import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/navigation/services.dart';
import '../../core/ui/gradient_bottom_bar.dart';
import '../../core/unread_counter.dart';
import '../../widgets/aurora_background.dart';
import '../auth/bloc/auth_bloc.dart';
import '../dashboard/presentation/dashboard_screen.dart';
import '../dashboard/presentation/my_orders_screen.dart';
import '../messages/presentation/messages_list_screen.dart';
import '../offers/presentation/offers_screen.dart';
import '../profile/presentation/profile_screen.dart';
import '../referral/presentation/referral_screen.dart';
import '../wallet/presentation/wallet_screen.dart';
import 'section_cubit.dart';
import '../../widgets/lazy_indexed_stack.dart';

/// Tayyorr.uz xizmati (ilmiy ishlar) — tayyorr+ bosh sahifasidan ochiladi.
/// Pastki panel: Asosiy, (tayyorlovchida) Takliflarim yoki (buyurtmachida) Buyurtmalarim,
/// Xabarlar, Hamyon, Profil.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    return ServiceMarker(
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
  AppSection.myOrders,
  AppSection.referral,
  AppSection.messages,
  AppSection.wallet,
  AppSection.profile,
];

class _HomeShellView extends StatelessWidget {
  const _HomeShellView();

  @override
  Widget build(BuildContext context) {
    final isPreparer = context.select<AuthBloc, bool>(
      (b) => b.state.user?.isPreparer ?? false,
    );
    final user = context.select<AuthBloc, (String?, String)>(
      (b) => (b.state.user?.image, b.state.user?.displayName ?? ''),
    );
    final bar = <AppSection>[
      AppSection.dashboard,
      if (isPreparer) AppSection.offers else AppSection.myOrders,
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
              body: ShellRootScope(
                kind: ServiceKind.uz,
                child: _SectionFade(
                  sectionKey: section,
                  child: LazyIndexedStack(
                    index: _sectionOrder.indexOf(section),
                    // rolga tegishli bo'lmagan bo'lim qurilmaydi (keraksiz so'rov yubormasin)
                    children: [
                      const DashboardScreen(),
                      isPreparer
                          ? const OffersScreen()
                          : const SizedBox.shrink(),
                      isPreparer
                          ? const SizedBox.shrink()
                          : const MyOrdersScreen(),
                      const ReferralScreen(),
                      const MessagesListScreen(),
                      const WalletScreen(),
                      const ProfileScreen(),
                    ],
                  ),
                ),
              ),
              bottomNavigationBar: ValueListenableBuilder<int>(
                valueListenable: UnreadCounter.instance,
                builder: (context, unread, _) => GradientBottomBar(
                  index: bar.indexOf(section),
                  onTap: (i) => SectionCubit.instance.select(bar[i]),
                  items: [for (final s in bar) _item(s, unread, user)],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  BottomBarItem _item(AppSection s, int unread, (String?, String) user) =>
      switch (s) {
        AppSection.dashboard => const BottomBarItem(
          icon: TI.home_outlined,
          activeIcon: TI.home_rounded,
          label: 'Asosiy',
        ),
        AppSection.offers => const BottomBarItem(
          icon: TI.back_hand_outlined,
          activeIcon: TI.back_hand_rounded,
          label: 'Takliflarim',
        ),
        AppSection.myOrders => const BottomBarItem(
          icon: TI.receipt_long_outlined,
          activeIcon: TI.receipt_long_rounded,
          label: 'Buyurtmalarim',
        ),
        AppSection.messages => BottomBarItem(
          icon: TI.chat_bubble_outline_rounded,
          activeIcon: TI.chat_bubble_rounded,
          label: 'Xabarlar',
          badge: unread,
        ),
        AppSection.wallet => const BottomBarItem(
          icon: TI.account_balance_wallet_outlined,
          activeIcon: TI.account_balance_wallet_rounded,
          label: 'Hamyon',
        ),
        AppSection.profile => BottomBarItem(
          icon: TI.person_outline_rounded,
          activeIcon: TI.person_rounded,
          label: 'Profil',
          avatar: (size, selected) =>
              profileAvatar(user.$1, user.$2, size, selected),
        ),
        AppSection.referral => const BottomBarItem(
          icon: TI.card_giftcard_outlined,
          activeIcon: TI.card_giftcard_rounded,
          label: 'Referal',
        ),
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

class _SectionFadeState extends State<_SectionFade>
    with SingleTickerProviderStateMixin {
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
