import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/app_dialogs.dart';
import '../../core/ui/liquid_glass.dart';
import '../../core/utils/format.dart';
import '../../widgets/reaction_emoji.dart';
import '../../widgets/skeleton.dart';
import '../../widgets/user_avatar.dart';
import '../../widgets/web_ui.dart';
import '../public_profile/presentation/public_profile_screen.dart';
import 'family_models.dart';
import 'family_repository.dart';

/// Popupdagi amal.
class FamilyPopupAction {
  const FamilyPopupAction(
    this.id,
    this.icon,
    this.label, {
    this.danger = false,
  });
  final String id;
  final TIData icon;
  final String label;
  final bool danger;
}

/// Xabar bosilganda: orqa fon xiralashadi, xabar o'z joyida «ko'tariladi», tepasida reaksiyalar,
/// pastida amallar va «Kördi / Reaksiyalar» qatori. Natija: amal id'si, `emoji:<e>`, `people:seen|reactions`.
/// Oddiy suhbatlarda ham ishlatiladi (`showInfo: false` — «Kördi / Reaksiyalar» qatorisiz).
Future<String?> showFamilyPopup(
  BuildContext context, {
  required Rect rect,
  required Widget preview,
  required bool alignRight,
  required String? myReaction,
  required List<FamilyPopupAction> actions,
  required int seen,
  required int reactionsCount,
  bool canReact = true,
  bool showInfo = true,
}) {
  HapticFeedback.selectionClick();
  return Navigator.of(context, rootNavigator: true).push<String>(
    PageRouteBuilder(
      opaque: false,
      barrierDismissible: true,
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 240),
      reverseTransitionDuration: const Duration(milliseconds: 180),
      pageBuilder: (ctx, a, _) => _FamilyPopup(
        animation: a,
        rect: rect,
        preview: preview,
        alignRight: alignRight,
        myReaction: myReaction,
        actions: actions,
        seen: seen,
        reactionsCount: reactionsCount,
        canReact: canReact,
        showInfo: showInfo,
      ),
    ),
  );
}

class _FamilyPopup extends StatelessWidget {
  const _FamilyPopup({
    required this.animation,
    required this.rect,
    required this.preview,
    required this.alignRight,
    required this.myReaction,
    required this.actions,
    required this.seen,
    required this.reactionsCount,
    required this.canReact,
    this.showInfo = true,
  });
  final Animation<double> animation;
  final Rect rect;
  final Widget preview;
  final bool alignRight;
  final String? myReaction;
  final List<FamilyPopupAction> actions;
  final int seen;
  final int reactionsCount;
  final bool canReact;
  final bool showInfo;

  static const _barH = 52.0;
  static const _cell = 36.0;
  static double barWidth(double screenW) =>
      math.min(kFamilyEmojis.length * _cell + 12, screenW - 24);
  static const _menuW = 236.0;
  static const _gap = 8.0;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final pad = MediaQuery.paddingOf(context);
    final infoRows = showInfo ? 1 + (reactionsCount > 0 ? 1 : 0) : 0;
    final menuH = actions.length * 46.0 + infoRows * 44.0 + 12;
    final barH = canReact ? _barH : 0.0;
    final minTop = pad.top + 12;
    final maxBottom = size.height - pad.bottom - 12;
    final avail = maxBottom - minTop - barH - menuH - _gap * 2;
    final previewH = math.max(48.0, math.min(rect.height, avail));
    final total = barH + _gap + previewH + _gap + menuH;
    // xabar o'z joyida qolishga harakat qiladi; sig'masa — siljiydi
    var top = rect.top - barH - _gap;
    top = top.clamp(minTop, math.max(minTop, maxBottom - total));
    final previewTop = top + barH + _gap;

    double sidePad(double desired, double w) =>
        desired.clamp(0.0, math.max(0.0, size.width - 24 - w));
    final barW = barWidth(size.width);
    final leftPad = sidePad(rect.left - 12, barW);
    final rightPad = sidePad(size.width - rect.right - 12, barW);
    final leftPadMenu = sidePad(rect.left - 12, _menuW);
    final rightPadMenu = sidePad(size.width - rect.right - 12, _menuW);

    final curve = CurvedAnimation(
      parent: animation,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    );
    final pop = CurvedAnimation(
      parent: animation,
      curve: Curves.easeOutBack,
      reverseCurve: Curves.easeInCubic,
    );

    return Material(
      type: MaterialType.transparency,
      child: Stack(
        children: [
          // xiralashgan fon — bosilsa yopiladi
          Positioned.fill(
            child: GestureDetector(
              onTap: () => Navigator.of(context).pop(),
              child: AnimatedBuilder(
                animation: curve,
                builder: (_, __) => BackdropFilter(
                  filter: ImageFilter.blur(
                    sigmaX: 14 * curve.value,
                    sigmaY: 14 * curve.value,
                  ),
                  child: Container(
                    color: Colors.black.withValues(
                      alpha: (AppColors.isLight ? 0.18 : 0.42) * curve.value,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // ko'tarilgan xabar
          AnimatedBuilder(
            animation: curve,
            builder: (_, child) => Positioned(
              left: rect.left,
              width: rect.width,
              top: lerpDouble(rect.top, previewTop, curve.value),
              height: previewH,
              child: Transform.scale(
                scale: 1 + 0.02 * curve.value,
                child: child,
              ),
            ),
            child: IgnorePointer(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: OverflowBox(
                  alignment: Alignment.topCenter,
                  maxHeight: double.infinity,
                  child: preview,
                ),
              ),
            ),
          ),
          if (canReact)
            Positioned(
              left: 12,
              right: 12,
              top: top,
              height: _barH,
              child: Align(
                alignment: alignRight
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Padding(
                  padding: EdgeInsets.only(
                    left: alignRight ? 0 : leftPad,
                    right: alignRight ? rightPad : 0,
                  ),
                  child: FadeTransition(
                    opacity: curve,
                    child: ScaleTransition(
                      scale: pop,
                      alignment: alignRight
                          ? Alignment.bottomRight
                          : Alignment.bottomLeft,
                      child: _EmojiBar(mine: myReaction, width: barW),
                    ),
                  ),
                ),
              ),
            ),
          Positioned(
            left: 12,
            right: 12,
            top: previewTop + previewH + _gap,
            child: Align(
              alignment: alignRight ? Alignment.topRight : Alignment.topLeft,
              child: Padding(
                padding: EdgeInsets.only(
                  left: alignRight ? 0 : leftPadMenu,
                  right: alignRight ? rightPadMenu : 0,
                ),
                child: FadeTransition(
                  opacity: curve,
                  child: ScaleTransition(
                    scale: pop,
                    alignment: alignRight
                        ? Alignment.topRight
                        : Alignment.topLeft,
                    child: _Menu(
                      actions: actions,
                      seen: seen,
                      reactionsCount: reactionsCount,
                      showInfo: showInfo,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmojiBar extends StatelessWidget {
  const _EmojiBar({required this.mine, required this.width});
  final String? mine;
  final double width;

  @override
  Widget build(BuildContext context) {
    // 10 ta reaksiya: ekranga sig'masa — gorizontal suriladi
    // iOS 26 reaksiyalar paneli — suyuq shisha kapsula
    return LiquidGlass(
      height: 52,
      width: width,
      panel: true,
      clip: true,
      borderRadius: BorderRadius.circular(26),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(99),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: Row(
            children: [
              for (final e in kFamilyEmojis)
                GestureDetector(
                  onTap: () => Navigator.of(context).pop('emoji:$e'),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    width: _FamilyPopup._cell,
                    height: _FamilyPopup._cell,
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: e == mine
                          ? const Color(0xFF6366F1).withValues(alpha: 0.22)
                          : null,
                    ),
                    child: ReactionEmoji(e, size: 23),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Menu extends StatelessWidget {
  const _Menu({
    required this.actions,
    required this.seen,
    required this.reactionsCount,
    this.showInfo = true,
  });
  final List<FamilyPopupAction> actions;
  final int seen;
  final int reactionsCount;
  final bool showInfo;

  @override
  Widget build(BuildContext context) {
    Widget row(
      TIData icon,
      String label,
      VoidCallback onTap, {
      bool danger = false,
      bool info = false,
    }) {
      final c = danger
          ? const Color(0xFFF43F5E)
          : (info ? WebC.zinc400 : AppColors.textPrimary);
      return InkWell(
        onTap: onTap,
        child: SizedBox(
          height: info ? 44 : 46,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      color: c,
                      fontSize: info ? 13.5 : 15,
                      fontWeight: info ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                TIcon(icon, size: info ? 16 : 18, color: c),
              ],
            ),
          ),
        ),
      );
    }

    // iOS 26 kontekst menyusi — suyuq shisha
    return LiquidGlass(
      width: _FamilyPopup._menuW,
      panel: true,
      clip: true,
      padding: const EdgeInsets.symmetric(vertical: 6),
      borderRadius: BorderRadius.circular(22),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showInfo) ...[
            row(
              TI.visibility_outlined,
              'Kördi: $seen',
              () => Navigator.of(context).pop('people:seen'),
              info: true,
            ),
            if (reactionsCount > 0)
              row(
                TI.favorite_rounded,
                'Reaksiyalar: $reactionsCount',
                () => Navigator.of(context).pop('people:reactions'),
                info: true,
              ),
            Divider(height: 1, color: WebC.border),
          ],
          for (final a in actions)
            row(
              a.icon,
              a.label,
              () => Navigator.of(context).pop(a.id),
              danger: a.danger,
            ),
        ],
      ),
    );
  }
}

/// Pufakcha ostidagi reaksiyalar: emoji + son; meniki — ajratilgan. Bosilsa — almashtiriladi,
/// bosib turilsa — kim bosganini ko'rsatadi.
class FamilyReactionChips extends StatelessWidget {
  const FamilyReactionChips({
    super.key,
    required this.message,
    required this.meId,
    required this.onTap,
    required this.onLongPress,
    this.alignRight = false,
  });
  final FamilyMessage message;
  final String? meId;
  final void Function(String emoji) onTap;
  final void Function(String emoji) onLongPress;
  final bool alignRight;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      alignment: alignRight ? WrapAlignment.end : WrapAlignment.start,
      children: [
        for (final r in message.reactions)
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              onTap(r.emoji);
            },
            onLongPress: () {
              HapticFeedback.mediumImpact();
              onLongPress(r.emoji);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: r.users.contains(meId)
                    ? const Color(0xFF6366F1).withValues(alpha: 0.22)
                    : AppColors.tint(0.06),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(
                  color: r.users.contains(meId)
                      ? const Color(0xFF818CF8)
                      : AppColors.cardBorder,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ReactionEmoji(r.emoji, size: 15),
                  const SizedBox(width: 4),
                  Text(
                    '${r.count}',
                    style: TextStyle(
                      color: r.users.contains(meId)
                          ? WebC.indigoSoft
                          : AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Kim ko'rgan / kim reaksiya bosgan — yorliqlar bilan.
Future<void> showFamilyPeople(
  BuildContext context,
  String messageId, {
  bool reactions = false,
  String? emoji,
}) {
  return showAppSheet(
    context,
    title: 'Xabar haqida',
    builder: (_) =>
        _People(messageId: messageId, reactions: reactions, emoji: emoji),
  );
}

class _People extends StatefulWidget {
  const _People({required this.messageId, required this.reactions, this.emoji});
  final String messageId;
  final bool reactions;
  final String? emoji;

  @override
  State<_People> createState() => _PeopleState();
}

class _PeopleState extends State<_People> {
  late bool _reactions = widget.reactions;
  late String? _emoji = widget.emoji;
  ({List<FamilyPerson> reactions, List<FamilyPerson> seen, int seenCount})?
  _data;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    FamilyRepository.instance
        .people(widget.messageId)
        .then((d) {
          if (mounted) setState(() => _data = d);
        })
        .catchError((_) {
          if (mounted) setState(() => _failed = true);
        });
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    final byEmoji = <String, int>{};
    for (final r in d?.reactions ?? const <FamilyPerson>[]) {
      byEmoji[r.emoji ?? ''] = (byEmoji[r.emoji ?? ''] ?? 0) + 1;
    }
    final list = d == null
        ? const <FamilyPerson>[]
        : _reactions
        ? d.reactions.where((r) => _emoji == null || r.emoji == _emoji).toList()
        : d.seen;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: AppColors.tint(0.06),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              _Tab(
                label: 'Kördi${d == null ? '' : ' · ${d.seenCount}'}',
                icon: TI.visibility_outlined,
                on: !_reactions,
                onTap: () => setState(() => _reactions = false),
              ),
              _Tab(
                label:
                    'Reaksiyalar${d == null ? '' : ' · ${d.reactions.length}'}',
                icon: TI.favorite_rounded,
                on: _reactions,
                onTap: () => setState(() => _reactions = true),
              ),
            ],
          ),
        ),
        if (_reactions && byEmoji.isNotEmpty) ...[
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _Filter(
                  label: 'Hammasi',
                  on: _emoji == null,
                  onTap: () => setState(() => _emoji = null),
                ),
                for (final e in byEmoji.entries)
                  _Filter(
                    label: '${e.value}',
                    emoji: e.key,
                    on: _emoji == e.key,
                    onTap: () => setState(() => _emoji = e.key),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        if (_failed)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              "Yuklab bölmadi",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted),
            ),
          )
        else if (d == null)
          for (var i = 0; i < 4; i++)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  SCircle(size: 40),
                  SizedBox(width: 12),
                  SBar(width: 150, height: 14),
                ],
              ),
            )
        else if (list.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              _reactions ? "Hali reaksiya yöq" : "Hali heç kim körmadi",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted),
            ),
          )
        else
          for (final p in list)
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => PublicProfileScreen(
                    userId: p.user.id,
                    allowMessage: false,
                  ),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 2),
                child: Row(
                  children: [
                    UserAvatar(
                      imageUrl: p.user.image,
                      initial: p.user.initial,
                      size: 40,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p.user.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            p.user.login != null
                                ? '@${p.user.login} · ${smartTime(p.at)}'
                                : smartTime(p.at),
                            style: TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (p.emoji != null) ReactionEmoji(p.emoji!, size: 22),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    required this.label,
    required this.icon,
    required this.on,
    required this.onTap,
  });
  final String label;
  final TIData icon;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 38,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(11),
            gradient: on
                ? const LinearGradient(
                    colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
                  )
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TIcon(
                icon,
                size: 16,
                color: on ? Colors.white : AppColors.textSecondary,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: on ? Colors.white : AppColors.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Filter extends StatelessWidget {
  const _Filter({
    required this.label,
    required this.on,
    required this.onTap,
    this.emoji,
  });
  final String label;
  final String? emoji;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: on
              ? const Color(0xFF6366F1).withValues(alpha: 0.2)
              : AppColors.tint(0.05),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: on ? const Color(0xFF818CF8) : AppColors.cardBorder,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (emoji != null) ...[
              ReactionEmoji(emoji!, size: 15),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                color: on ? WebC.indigoSoft : AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
