import 'package:flutter/material.dart';

import '../../core/navigation/services.dart';
import '../../core/ui/gradient_bottom_bar.dart';
import '../../widgets/aurora_background.dart';
import '../wallet/presentation/wallet_screen.dart';
import 'presentation/smm_catalog_screen.dart';
import 'presentation/smm_discounts_screen.dart';
import 'presentation/smm_orders_screen.dart';

/// Tayyorr SMM xizmati — tayyorr+ bosh sahifasidan ochiladi (saytga chiqmaydi).
/// Pastki panel: Xizmatlar, Çegirmalar, Buyurtmalar, Hamyon (hamyon — barcha xizmatlar uchun bitta).
class SmmShell extends StatelessWidget {
  const SmmShell({super.key});

  /// Joriy bo'lim (boshqa joydan ochishda tanlash uchun).
  static final tab = ValueNotifier<int>(0);

  static const _items = [
    BottomBarItem(icon: Icons.grid_view_outlined, activeIcon: Icons.grid_view_rounded, label: 'Xizmatlar'),
    BottomBarItem(icon: Icons.local_offer_outlined, activeIcon: Icons.local_offer_rounded, label: 'Çegirmalar'),
    BottomBarItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded, label: 'Buyurtmalar'),
    BottomBarItem(icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet_rounded, label: 'Hamyon'),
  ];

  @override
  Widget build(BuildContext context) {
    void go(int i) => tab.value = i;
    return ServiceScope(
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
              body: IndexedStack(
                index: i,
                children: [
                  SmmCatalogScreen(onOrdersTap: () => go(2), onDiscountsTap: () => go(1)),
                  SmmDiscountsScreen(onOrdersTap: () => go(2), onAllTap: () => go(0)),
                  SmmOrdersScreen(onCatalogTap: () => go(0)),
                  const WalletScreen(),
                ],
              ),
              bottomNavigationBar: GradientBottomBar(items: _items, index: i, onTap: go),
            ),
          ),
        ),
      ),
    );
  }
}
