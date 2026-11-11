import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class BottomBarItem {
  const BottomBarItem({required this.icon, required this.activeIcon, required this.label, this.badge = 0});
  final IconData icon;
  final IconData activeIcon;
  final String label;

  /// O'qilmaganlar soni va h.k. (0 — ko'rinmaydi)
  final int badge;
}

/// Pastki panel: suzib turuvchi shisha kartochka. Tanlangan bo'lim — binafsha→ko'k gradient
/// "tabletka" ichida ikonka va to'liq nom; qolganlari — faqat ikonka. Almashganda silliq kengayadi.
class GradientBottomBar extends StatelessWidget {
  const GradientBottomBar({super.key, required this.items, required this.index, required this.onTap});
  final List<BottomBarItem> items;
  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(12, 0, 12, bottom > 0 ? bottom : 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(26),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
          child: Container(
            height: 66,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: light ? Colors.white.withValues(alpha: 0.9) : const Color(0xFF12121B).withValues(alpha: 0.88),
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: AppColors.tint(light ? 0.07 : 0.1)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: light ? 0.08 : 0.35), blurRadius: 30, offset: const Offset(0, 10), spreadRadius: -8),
              ],
            ),
            child: Row(
              children: [
                for (var i = 0; i < items.length; i++)
                  Expanded(
                    flex: i == index ? (items.length > 4 ? 26 : 24) : 10,
                    child: _Item(item: items[i], selected: i == index, onTap: () => onTap(i)),
                  ),
              ],
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
    final idle = AppColors.isLight ? const Color(0xFF71717A) : const Color(0xFFA1A1AA);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Center(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 320),
          curve: Curves.easeOutCubic,
          height: 46,
          padding: EdgeInsets.symmetric(horizontal: selected ? 14 : 0),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: selected
                ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)])
                : null,
            boxShadow: selected
                ? [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.45), blurRadius: 18, offset: const Offset(0, 6), spreadRadius: -6)]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(clipBehavior: Clip.none, children: [
                Icon(selected ? item.activeIcon : item.icon, size: 23, color: selected ? Colors.white : idle),
                if (item.badge > 0)
                  Positioned(
                    right: -8,
                    top: -6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      constraints: const BoxConstraints(minWidth: 18),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF43F5E),
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: selected ? const Color(0xFF7C6CF5) : (AppColors.isLight ? Colors.white : const Color(0xFF12121B)), width: 2),
                      ),
                      child: Text(item.badge > 99 ? '99+' : '${item.badge}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                    ),
                  ),
              ]),
              // tanlanganda nomi o'ng tomonda to'liq chiqadi
              AnimatedSize(
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
            ],
          ),
        ),
      ),
    );
  }
}
