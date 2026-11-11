import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../core/navigation/services.dart';
import '../../core/ui/gradient_bottom_bar.dart';
import '../../widgets/aurora_background.dart';
import '../auth/bloc/auth_bloc.dart';
import '../guide/guide_screen.dart';
import '../profile/presentation/profile_screen.dart';
import '../wallet/presentation/wallet_screen.dart';
import '../family/family_repository.dart';
import 'plus_home_screen.dart';
import 'plus_messages_tab.dart';

/// tayyorr+ — ilovaning bosh qobig'i (ochilganda birinchi). Pastki panel:
/// Bosh sahifa, Hamyon, Xabarlar (Tayyorr Support + «Tayyorr’s Family»), Qo'llanma, Profil.
class PlusShell extends StatelessWidget {
  const PlusShell({super.key});

  static final tab = ValueNotifier<int>(0);

  @override
  Widget build(BuildContext context) {
    final user = context.select<AuthBloc, (String?, String)>((b) => (b.state.user?.image, b.state.user?.displayName ?? ''));
    return ServiceScope(
      kind: ServiceKind.plus,
      child: ValueListenableBuilder<int>(
        valueListenable: tab,
        builder: (context, i, _) => PopScope(
          canPop: i == 0,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) tab.value = 0;
          },
          child: AuroraBackground(
            child: Scaffold(
              backgroundColor: Colors.transparent,
              extendBody: true,
              body: ShellRootScope(
                kind: ServiceKind.plus,
                child: IndexedStack(
                  index: i,
                  children: [
                    const PlusHomeScreen(),
                    const WalletScreen(),
                    // faqat ochiq turganda quriladi (fonda so'rab turmasin)
                    i == 2 ? const PlusMessagesTab() : const SizedBox.shrink(),
                    const GuideScreen(),
                    const ProfileScreen(),
                  ],
                ),
              ),
              bottomNavigationBar: ValueListenableBuilder(
                valueListenable: FamilySummary.instance.value,
                builder: (context, fam, _) => GradientBottomBar(
                index: i,
                onTap: (v) => tab.value = v,
                items: [
                  const BottomBarItem(icon: TI.home_outlined, activeIcon: TI.home_rounded, label: 'Boş sahifa'),
                  const BottomBarItem(icon: TI.account_balance_wallet_outlined, activeIcon: TI.account_balance_wallet_rounded, label: 'Hamyon'),
                  BottomBarItem(icon: TI.chat_bubble_outline_rounded, activeIcon: TI.chat_bubble_rounded, label: 'Xabarlar', badge: fam.mentions > 0 ? fam.mentions : fam.unread),
                  const BottomBarItem(icon: TI.menu_book_rounded, activeIcon: TI.menu_book_rounded, label: "Qöllanma"),
                  BottomBarItem(
                    icon: TI.person_outline_rounded,
                    activeIcon: TI.person_rounded,
                    label: 'Profil',
                    avatar: (size, selected) => profileAvatar(user.$1, user.$2, size, selected),
                  ),
                ],
              ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
