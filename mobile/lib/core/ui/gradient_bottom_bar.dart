import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
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

/// Pastki panel: fondan aniq ajralib turuvchi suzib turgan kartochka. Tanlangan bo'lim —
/// binafsha→ko'k gradient "tabletka" (ikonka + to'liq nom); tabletka panel chetidan hamma
/// tomondan bir xil masofada turadi (birinchi va oxirgi bo'limda ham).
class GradientBottomBar extends StatelessWidget {
  const GradientBottomBar({super.key, required this.items, required this.index, required this.onTap});
  final List<BottomBarItem> items;
  final int index;
  final ValueChanged<int> onTap;

  static const double height = 68;
  static const double inset = 7;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(12, 0, 12, bottom > 0 ? bottom + 2 : 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: light ? 0.14 : 0.55), blurRadius: 34, offset: const Offset(0, 14), spreadRadius: -6),
            BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: light ? 0.08 : 0.16), blurRadius: 24, spreadRadius: -4),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
            child: Container(
              height: height,
              padding: const EdgeInsets.all(inset),
              decoration: BoxDecoration(
                // fondan ajralib turishi uchun — sahifadan yorqinroq sirt + aniq chegara
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: light
                      ? [Colors.white, const Color(0xFFF4F4FA)]
                      : [const Color(0xFF242436).withValues(alpha: 0.97), const Color(0xFF1A1A28).withValues(alpha: 0.97)],
                ),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: light ? Colors.black.withValues(alpha: 0.09) : Colors.white.withValues(alpha: 0.14)),
              ),
              child: Row(
                children: [
                  for (var i = 0; i < items.length; i++)
                    Expanded(
                      flex: i == index ? (items.length > 4 ? 30 : 26) : 10,
                      child: _Item(item: items[i], selected: i == index, onTap: () => onTap(i)),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({required this.item, required this.selected, required this.onTap});
  final BottomBarItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final idle = AppColors.isLight ? const Color(0xFF6B6B7B) : const Color(0xFFB4B4C3);
    final icon = item.avatar != null
        ? item.avatar!(26, selected)
        : TIcon(selected ? item.activeIcon : item.icon, size: 23, color: selected ? Colors.white : idle);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
        // tabletka butun bo'lim balandligi va kengligini egallaydi — chetlardan masofa hamma tomonda bir xil
        height: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(21),
          gradient: selected ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]) : null,
          boxShadow: selected
              ? [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.45), blurRadius: 16, offset: const Offset(0, 5), spreadRadius: -6)]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(clipBehavior: Clip.none, children: [
              icon,
              if (item.badge > 0)
                Positioned(
                  right: -9,
                  top: -6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    constraints: const BoxConstraints(minWidth: 18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF43F5E),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: selected ? const Color(0xFF7C6CF5) : (AppColors.isLight ? Colors.white : const Color(0xFF20202F)), width: 2),
                    ),
                    child: Text(item.badge > 99 ? '99+' : '${item.badge}',
                        textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                  ),
                ),
            ]),
            Flexible(
              child: AnimatedSize(
                duration: const Duration(milliseconds: 320),
                curve: Curves.easeOutCubic,
                child: selected
                    ? Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: Text(
                          item.label,
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.fade,
                          style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w700, letterSpacing: -0.1),
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
            ),
          ],
        ),
      ),
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
        ? Center(child: Text(initial, style: TextStyle(color: Colors.white, fontSize: size * 0.45, fontWeight: FontWeight.w800)))
        : ClipOval(child: SizedBox.expand(child: Image.network(image!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()))),
  );
}
