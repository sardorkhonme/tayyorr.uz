import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import '../theme/app_colors.dart';
import 'liquid_glass.dart';
import 'ticons.dart';

class BottomBarItem {
  const BottomBarItem({required this.icon, required this.activeIcon, required this.label, this.badge = 0, this.avatar});
  final TIData icon;
  final TIData activeIcon;
  final String label;

  /// O'qilmaganlar soni va h.k. (0 — ko'rinmaydi)
  final int badge;

  /// Ikonka o'rniga (masalan Profil — foydalanuvchi rasmi): (o'lcham, tanlanganmi) → vidjet
  final Widget Function(double size, bool selected)? avatar;
}

/// Pastki panel — iOS 26 dagi kabi suzib turuvchi «suyuq shisha» tab bar (`GlassTabBar.bottom`).
///  · panel orqasidagi kontent shisha qirralarida linzadek egilib-sinadi (Impeller'da), frost va yorug' qirra;
///  · tanlangan bo'lim — shisha linza: bosib turilganda linza ko'tarilib kattalashadi, tiniqlashadi va
///    ostidagi ikonkani kattalashtirib ko'rsatadi; barmoq bilan surilsa linza cho'zilib ergashadi
///    (tez siltansa — bir nechta bo'limga o'tadi), qo'yib yuborilganda prujinadek eng yaqin bo'limga tushadi;
///  · bosib boshqa bo'limga o'tilganda linza yo'lda cho'zilib (jelly) oqib o'tadi.
class GradientBottomBar extends StatelessWidget {
  const GradientBottomBar({super.key, required this.items, required this.index, required this.onTap});
  final List<BottomBarItem> items;
  final int index;
  final ValueChanged<int> onTap;

  static const double height = 62;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final selected = light ? const Color(0xFF4F46E5) : const Color(0xFFB4B5FF);
    final idle = light ? const Color(0xFF3F3F46) : const Color(0xFFD4D4DC);
    return Padding(
      padding: EdgeInsets.only(bottom: bottom > 0 ? bottom - 6 : 4),
      child: GlassTabBar.bottom(
        selectedIndex: index.clamp(0, items.length - 1),
        onTabSelected: (i) {
          HapticFeedback.selectionClick();
          onTap(i);
        },
        horizontalPadding: 14,
        verticalPadding: 8,
        barHeight: height,
        iconSize: 24,
        labelFontSize: items.length > 5 ? 10 : 10.5,
        settings: glassSettings(),
        selectedIconColor: selected,
        selectedLabelColor: selected,
        unselectedIconColor: idle,
        unselectedLabelColor: idle,
        tabs: [
          for (final it in items)
            GlassTab(
              label: it.label,
              semanticLabel: it.label,
              icon: _icon(it, false),
              activeIcon: _icon(it, true),
            ),
        ],
      ),
    );
  }

  Widget _icon(BottomBarItem it, bool selected) {
    final icon = it.avatar != null ? it.avatar!(26, selected) : TIcon(selected ? it.activeIcon : it.icon, size: 24);
    if (it.badge <= 0) return icon;
    final light = AppColors.isLight;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        icon,
        Positioned(
          right: -10,
          top: -6,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            constraints: const BoxConstraints(minWidth: 18),
            decoration: BoxDecoration(
              color: const Color(0xFFF43F5E),
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: light ? Colors.white : const Color(0xFF2A2A3C), width: 2),
            ),
            child: Text(
              it.badge > 99 ? '99+' : '${it.badge}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, height: 1.2),
            ),
          ),
        ),
      ],
    );
  }
}

/// Profil bo'limi uchun — foydalanuvchi rasmi (bo'lmasa bosh harfi gradient doirada).
Widget profileAvatar(String? image, String name, double size, bool selected) {
  final initial = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();
  return Container(
    width: size,
    height: size,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: (image ?? '').isEmpty ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]) : null,
    ),
    // chegara rasm ustida — rasm doirani to'liq qoplaydi (burchaklari ko'rinmaydi)
    foregroundDecoration: BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(color: selected ? Colors.white : Colors.white.withValues(alpha: 0.25), width: selected ? 2 : 1.2),
    ),
    child: (image ?? '').isEmpty
        ? Center(
            child: Text(
              initial,
              style: TextStyle(color: Colors.white, fontSize: size * 0.45, fontWeight: FontWeight.w800),
            ),
          )
        : ClipOval(
            child: SizedBox.expand(
              child: Image.network(image!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()),
            ),
          ),
  );
}
