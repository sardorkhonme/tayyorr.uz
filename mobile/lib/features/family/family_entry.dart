import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../app.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/web_ui.dart';
import 'family_repository.dart';
import 'family_screen.dart';

const kFamilyName = "Tayyorr\u2019s Family";

/// Guruhni ochish (istalgan joydan, bildirishnomadan ham). Ochiq bo'lsa — qayta ochilmaydi.
Future<void> openFamily([BuildContext? context]) async {
  if (FamilyScreen.isOpen) return;
  final nav = context != null ? Navigator.of(context) : navigatorKey.currentState;
  if (nav == null) return;
  await nav.push(MaterialPageRoute(builder: (_) => const FamilyScreen()));
  FamilySummary.instance.refresh(force: true);
}

/// Guruh belgisi — binafsha→ko'k gradient doirada «oila» ikonkasi.
class FamilyMark extends StatelessWidget {
  const FamilyMark({super.key, this.size = 44});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF472B6), Color(0xFF8B5CF6), Color(0xFF3B82F6)],
        ),
        boxShadow: [
          BoxShadow(color: const Color(0xFF8B5CF6).withValues(alpha: 0.35), blurRadius: size * 0.4, offset: Offset(0, size * 0.12), spreadRadius: -size * 0.12),
        ],
      ),
      child: TIcon(TI.family, size: size * 0.56, color: Colors.white),
    );
  }
}

/// O'qilmaganlar / @belgilashlar nishonchalari.
class _Badges extends StatelessWidget {
  const _Badges();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: FamilySummary.instance.value,
      builder: (context, v, _) => Row(mainAxisSize: MainAxisSize.min, children: [
        if (v.mentions > 0) ...[
          Container(
            height: 24,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const TIcon(TI.alternate_email_rounded, size: 13, color: Colors.white),
              const SizedBox(width: 3),
              Text('${v.mentions}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
            ]),
          ),
          const SizedBox(width: 6),
        ],
        if (v.unread > 0)
          Container(
            height: 24,
            constraints: const BoxConstraints(minWidth: 24),
            padding: const EdgeInsets.symmetric(horizontal: 7),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: const Color(0xFFF43F5E), borderRadius: BorderRadius.circular(99)),
            child: Text(v.unread >= 99 ? '99+' : '${v.unread}',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
          ),
      ]),
    );
  }
}

/// tayyorr+ bosh sahifasining tepasidagi katta karta.
class FamilyHubCard extends StatelessWidget {
  const FamilyHubCard({super.key});

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    return GestureDetector(
      onTap: () => openFamily(context),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: light
                ? [const Color(0xFFFDF2F8), const Color(0xFFEEF2FF)]
                : [const Color(0xFF3B1D4A).withValues(alpha: 0.75), const Color(0xFF1E2350).withValues(alpha: 0.75)],
          ),
          border: Border.all(color: light ? const Color(0xFFE9D5FF) : Colors.white.withValues(alpha: 0.12)),
        ),
        child: Row(children: [
          const FamilyMark(size: 52),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(
                  child: Text(
                    kFamilyName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.spaceGrotesk(color: WebC.white, fontSize: 19, fontWeight: FontWeight.w700, letterSpacing: -0.4),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: WebC.indigoFill, borderRadius: BorderRadius.circular(6)),
                  child: Text('faqat ilovada', style: TextStyle(color: WebC.indigoSoft, fontSize: 10, fontWeight: FontWeight.w700)),
                ),
              ]),
              const SizedBox(height: 3),
              Text(
                'Barça tayyorr aʼzolari bir joyda — yangiliklar, savollar va suhbat.',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: WebC.zinc400, fontSize: 13, height: 1.35),
              ),
            ]),
          ),
          const SizedBox(width: 8),
          Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
            const _Badges(),
            const SizedBox(height: 6),
            TIcon(TI.chevron_right_rounded, size: 20, color: WebC.zinc500),
          ]),
        ]),
      ),
    );
  }
}

/// Xabarlar ro'yxatining tepasida qadalgan qator.
class FamilyListRow extends StatelessWidget {
  const FamilyListRow({super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => openFamily(context),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: WebC.indigoFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.35)),
        ),
        child: Row(children: [
          const FamilyMark(size: 44),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(
                  child: Text(kFamilyName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(width: 6),
                TIcon(TI.push_pin_rounded, size: 13, color: WebC.indigoSoft),
              ]),
              const SizedBox(height: 2),
              Text('Umumiy guruh — barça aʼzolar', style: TextStyle(color: WebC.zinc500, fontSize: 13)),
            ]),
          ),
          const _Badges(),
        ]),
      ),
    );
  }
}
