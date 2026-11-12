import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';

import '../../core/navigation/services.dart';
import '../../core/ui/gradient_bottom_bar.dart';
import '../../widgets/aurora_background.dart';
import '../wallet/presentation/wallet_screen.dart';
import '../profile/presentation/profile_screen.dart';
import '../auth/bloc/auth_bloc.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'presentation/smm_catalog_screen.dart';
import 'presentation/smm_discounts_screen.dart';
import 'presentation/smm_orders_screen.dart';
import '../../widgets/lazy_indexed_stack.dart';

/// Tayyorr SMM xizmati — tayyorr+ bosh sahifasidan ochiladi (saytga chiqmaydi).
/// Pastki panel: Xizmatlar, Çegirmalar, Buyurtmalar, Hamyon (barcha xizmatlar uchun bitta), Profil.
class SmmShell extends StatelessWidget {
  const SmmShell({super.key});

  /// Joriy bo'lim (boshqa joydan ochishda tanlash uchun).
  static final tab = ValueNotifier<int>(0);

  static const _base = [
    BottomBarItem(
      icon: TI.grid_view_outlined,
      activeIcon: TI.grid_view_rounded,
      label: 'Xizmatlar',
    ),
    BottomBarItem(
      icon: TI.local_offer_outlined,
      activeIcon: TI.local_offer_rounded,
      label: 'Çegirmalar',
    ),
    BottomBarItem(
      icon: TI.receipt_long_outlined,
      activeIcon: TI.receipt_long_rounded,
      label: 'Buyurtmalar',
    ),
    BottomBarItem(
      icon: TI.account_balance_wallet_outlined,
      activeIcon: TI.account_balance_wallet_rounded,
      label: 'Hamyon',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    void go(int i) => tab.value = i;
    final user = context.select<AuthBloc, (String?, String)>(
      (b) => (b.state.user?.image, b.state.user?.displayName ?? ''),
    );
    final items = [
      ..._base,
      BottomBarItem(
        icon: TI.person_outline_rounded,
        activeIcon: TI.person_rounded,
        label: 'Profil',
        avatar: (size, selected) =>
            profileAvatar(user.$1, user.$2, size, selected),
      ),
    ];
    return ServiceMarker(
      kind: ServiceKind.smm,
      child: ValueListenableBuilder<int>(
        valueListenable: tab,
        builder: (context, i, _) => PopScope(
          // ichki bo'limda "orqaga" — avval Xizmatlar, keyin tayyorr+
          canPop: i == 0,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) go(0);
          },
          child: AuroraBackground(
            child: Scaffold(
              backgroundColor: Colors.transparent,
              extendBody: true,
              body: ShellRootScope(
                kind: ServiceKind.smm,
                child: LazyIndexedStack(
                  index: i,
                  children: [
                    SmmCatalogScreen(
                      onOrdersTap: () => go(2),
                      onDiscountsTap: () => go(1),
                    ),
                    SmmDiscountsScreen(
                      onOrdersTap: () => go(2),
                      onAllTap: () => go(0),
                    ),
                    SmmOrdersScreen(onCatalogTap: () => go(0)),
                    const WalletScreen(),
                    const ProfileScreen(),
                  ],
                ),
              ),
              bottomNavigationBar: GradientBottomBar(
                items: items,
                index: i,
                onTap: go,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
