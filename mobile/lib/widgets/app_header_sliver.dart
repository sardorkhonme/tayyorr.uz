import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app.dart';
import '../core/theme/app_colors.dart';
import '../core/unread_counter.dart';
import '../features/auth/bloc/auth_bloc.dart';
import '../features/home/section_cubit.dart';
import 'app_logo.dart';
import 'theme_toggle.dart';
import 'web_ui.dart';

/// Saytdagi mobil header: tepada suzib turuvchi shisha panel — chapda logo,
/// o'ngda avatar (profilga) va menyu tugmasi. Scroll'da doim ko'rinadi.
class AppHeaderSliver extends StatelessWidget {
  const AppHeaderSliver({super.key});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return SliverPersistentHeader(
      pinned: true,
      delegate: _HeaderDelegate(top),
    );
  }
}

class _HeaderDelegate extends SliverPersistentHeaderDelegate {
  _HeaderDelegate(this.topInset);
  final double topInset;

  static const double barHeight = 56;
  double get _extent => topInset + 12 + barHeight + 4;

  @override
  double get minExtent => _extent;
  @override
  double get maxExtent => _extent;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Padding(
      padding: EdgeInsets.fromLTRB(12, topInset + 12, 12, 4),
      child: const WebHeaderBar(),
    );
  }

  @override
  bool shouldRebuild(covariant _HeaderDelegate old) => old.topInset != topInset;
}

/// Headerning o'zi (sliver'siz) — ichki sahifalarda ham ishlatiladi.
class WebHeaderBar extends StatelessWidget {
  const WebHeaderBar({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;
    final image = user?.image ?? '';
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
        child: Container(
          height: _HeaderDelegate.barHeight,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: WebC.headerBar,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.isLight ? Colors.black.withValues(alpha: 0.10) : Colors.white.withValues(alpha: 0.12),
            ),
          ),
          child: Row(
            children: [
              // ichki sahifada — doim ko'rinadigan orqaga tugmasi
              if (ModalRoute.of(context)?.canPop ?? false) ...[
                GestureDetector(
                  onTap: () => Navigator.of(context).maybePop(),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: WebC.fill5,
                      border: Border.all(color: WebC.border),
                    ),
                    child: Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: WebC.zinc300),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              GestureDetector(
                onTap: () => goToSection(context, AppSection.dashboard),
                child: const AppLogo(height: 16),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => goToSection(context, AppSection.profile),
                child: Container(
                  width: 36,
                  height: 36,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: WebC.fill5,
                    border: Border.all(
                      color: AppColors.isLight ? Colors.black.withValues(alpha: 0.10) : Colors.white.withValues(alpha: 0.15),
                    ),
                  ),
                  child: image.isEmpty
                      ? null
                      : Image.network(image, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()),
                ),
              ),
              const SizedBox(width: 10),
              const _MenuButton(),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bo'limga o'tish: ichki sahifada bo'lsa — bosh qobiqqa qaytadi.
void goToSection(BuildContext context, AppSection section) {
  SectionCubit.instance.select(section);
  final nav = navigatorKey.currentState;
  if (nav != null && nav.canPop()) nav.popUntil((r) => r.isFirst);
}

class _MenuButton extends StatelessWidget {
  const _MenuButton();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: UnreadCounter.instance,
      builder: (context, unread, _) {
        return GestureDetector(
          onTap: () => _openMenu(context),
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: WebC.fill5,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: WebC.border),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 16,
                  height: 14,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(
                      3,
                      (_) => Container(
                        height: 2,
                        decoration: BoxDecoration(color: WebC.zinc200, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                  ),
                ),
                if (unread > 0)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.indigo,
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF0B0B12), width: 2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openMenu(BuildContext context) {
    UnreadCounter.instance.refresh();
    final box = context.findRenderObject() as RenderBox;
    final pos = box.localToGlobal(Offset.zero);
    final size = MediaQuery.sizeOf(context);
    final top = pos.dy + box.size.height + 8;
    final right = size.width - (pos.dx + box.size.width);
    final isFirst = ModalRoute.of(context)?.isFirst ?? true;
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'menu',
      barrierColor: AppColors.isLight
          ? const Color(0xFFE4E4E9).withValues(alpha: 0.66)
          : Colors.black.withValues(alpha: 0.5),
      transitionDuration: const Duration(milliseconds: 160),
      pageBuilder: (dialogContext, _, __) => Stack(
        children: [
          // saytdagi kabi: menyu ochiq paytda tugma ✕ ko'rinishida turadi
          Positioned(
            left: pos.dx,
            top: pos.dy,
            child: GestureDetector(
              onTap: () => Navigator.of(dialogContext).pop(),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.isLight ? Colors.white : const Color(0xFF16161D),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: WebC.border),
                ),
                child: Icon(Icons.close_rounded, size: 18, color: WebC.zinc200),
              ),
            ),
          ),
          Positioned(
            top: top,
            right: right,
            width: 240,
            child: BlocProvider.value(
              value: context.read<AuthBloc>(),
              child: _MenuPanel(active: isFirst ? SectionCubit.instance.state : null, outer: context),
            ),
          ),
        ],
      ),
      transitionBuilder: (_, anim, __, child) {
        final a = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: a,
          child: ScaleTransition(
            alignment: Alignment.topRight,
            scale: Tween(begin: 0.96, end: 1.0).animate(a),
            child: child,
          ),
        );
      },
    );
  }
}

class _NavItem {
  const _NavItem(this.section, this.label, this.icon);
  final AppSection section;
  final String label;
  final IconData icon;
}

/// Saytdagi `navForRole`: tayyorlovchiga "Mening takliflarim" va "Referal" ham.
List<_NavItem> _navForRole(bool isPreparer) => [
      const _NavItem(AppSection.dashboard, 'Asosiy menyu', Icons.home_rounded),
      if (isPreparer) ...const [
        _NavItem(AppSection.offers, 'Mening takliflarim', Icons.back_hand_rounded),
        _NavItem(AppSection.referral, 'Referal', Icons.card_giftcard_rounded),
      ],
      const _NavItem(AppSection.messages, 'Xabarlar', Icons.chat_bubble_outline_rounded),
      const _NavItem(AppSection.wallet, 'Hamyon', Icons.account_balance_wallet_rounded),
      const _NavItem(AppSection.profile, 'Profil', Icons.person_rounded),
    ];

class _MenuPanel extends StatelessWidget {
  const _MenuPanel({required this.active, required this.outer});
  final AppSection? active;
  final BuildContext outer;

  void _go(BuildContext context, AppSection s) {
    Navigator.of(context).pop();
    goToSection(outer, s);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;
    final isPreparer = user?.isPreparer ?? false;
    final items = _navForRole(isPreparer);
    final divider = Container(height: 1, margin: const EdgeInsets.symmetric(vertical: 4), color: WebC.border);

    return Material(
      type: MaterialType.transparency,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
          child: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.isLight ? Colors.white : WebC.panel,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: WebC.border),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 50, offset: const Offset(0, 25), spreadRadius: -12),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isPreparer) ...[
                  _Row(
                    icon: Icons.star_rounded,
                    label: 'Stars',
                    color: WebC.amber,
                    trailing: _Pill('${user?.starBalance ?? 0}', bg: const Color(0xFFF59E0B).withValues(alpha: 0.15), fg: WebC.amber),
                    onTap: () => _go(context, AppSection.wallet),
                  ),
                  divider,
                ],
                ValueListenableBuilder<int>(
                  valueListenable: UnreadCounter.instance,
                  builder: (context, unread, _) => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final it in items) ...[
                        _Row(
                          icon: it.icon,
                          label: it.label,
                          active: it.section == active,
                          trailing: it.section == AppSection.messages && unread > 0
                              ? _Pill('$unread', bg: const Color(0xFF6366F1), fg: Colors.white, bold: true)
                              : null,
                          onTap: () => _go(context, it.section),
                        ),
                      ],
                    ],
                  ),
                ),
                divider,
                // tayyorr+ — saytdagidek menyuning eng pastida, gradient kartochka
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 4, 4, 2),
                  child: _PlusCard(onTap: () {
                    Navigator.of(context).pop();
                    launchUrl(Uri.parse('https://plus.tayyorr.uz'), mode: LaunchMode.externalApplication);
                  }),
                ),
                const Padding(
                  padding: EdgeInsets.fromLTRB(4, 4, 4, 4),
                  child: ThemeToggle(bare: true),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// tayyorr+ (plus.tayyorr.uz) kartochkasi — gradient fon, saytdagi TayyorrPlusCard bilan bir xil.
class _PlusCard extends StatelessWidget {
  const _PlusCard({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFD946EF)],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(color: const Color(0xFFD946EF).withValues(alpha: 0.25), blurRadius: 16, offset: const Offset(0, 6)),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Icon(Icons.auto_awesome_rounded, size: 18, color: Colors.white),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text.rich(
                    TextSpan(children: [
                      TextSpan(text: 'tayyorr'),
                      TextSpan(text: '+', style: TextStyle(color: Color(0xFFFDE68A))),
                    ]),
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 1),
                  Text('SMM va boshqalar', style: TextStyle(color: Color(0xCCFFFFFF), fontSize: 11)),
                ],
              ),
            ),
            const Icon(Icons.north_east_rounded, size: 16, color: Color(0xCCFFFFFF)),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
    this.trailing,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;
  final Widget? trailing;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: active ? WebC.indigoFill : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color ?? (active ? WebC.white : WebC.zinc300)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(color: color ?? (active ? WebC.white : WebC.zinc300), fontSize: 14),
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.text, {required this.bg, required this.fg, this.bold = false});
  final String text;
  final Color bg;
  final Color fg;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(text, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}
