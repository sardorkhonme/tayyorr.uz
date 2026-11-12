import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/ui/platform_icon.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/mascot.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_ui.dart';
import '../data/smm_models.dart';

String som(int n) => '${groupDigits(n)} söm';

/// "♻️ 30 kun kafolat" (yashil) yoki "⚠️ Kafolatsiz" (sariq).
class GuaranteeBadge extends StatelessWidget {
  const GuaranteeBadge({super.key, required this.label, required this.ok});
  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    final c = ok ? const Color(0xFF10B981) : const Color(0xFFF59E0B);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        '${ok ? '♻️' : '⚠️'} $label',
        style: TextStyle(
          color: ok ? const Color(0xFF059669) : const Color(0xFFD97706),
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// "👍 Tavsiya etiladi" / "👎 Tavsiya etilmaydi".
class VerdictBadge extends StatelessWidget {
  const VerdictBadge({super.key, required this.ok});
  final bool ok;

  @override
  Widget build(BuildContext context) {
    final c = ok ? const Color(0xFF10B981) : const Color(0xFFF43F5E);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        ok ? '👍 Tavsiya etiladi' : '👎 Tavsiya etilmaydi',
        style: TextStyle(
          color: ok ? const Color(0xFF059669) : const Color(0xFFE11D48),
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// "−20%" yorlig'i.
class DiscountBadge extends StatelessWidget {
  const DiscountBadge(this.pct, {super.key, this.big = false});
  final int pct;
  final bool big;

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.symmetric(
      horizontal: big ? 10 : 7,
      vertical: big ? 4 : 2,
    ),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [Color(0xFFF43F5E), Color(0xFFD946EF)],
      ),
      borderRadius: BorderRadius.circular(99),
    ),
    child: Text(
      '−$pct%',
      style: TextStyle(
        color: Colors.white,
        fontSize: big ? 13 : 11,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

/// Platforma gradient kvadrati + belgisi.
class PlatformBadge extends StatelessWidget {
  const PlatformBadge(this.p, {super.key, this.size = 44});
  final SmmPlatform p;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      gradient: p.gradient,
      borderRadius: BorderRadius.circular(size * 0.3),
    ),
    child: Center(child: PlatformIcon(p.key, size: size * 0.5)),
  );
}

class SmmTag extends StatelessWidget {
  const SmmTag(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: WebC.fill5,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: WebC.border),
    ),
    child: Text(text, style: TextStyle(color: WebC.zinc400, fontSize: 11.5)),
  );
}

/// Xizmat kartochkasi — saytdagi ServiceCard: nom, teglar, tavsiya, kafolat, oraliq va 1000 ta narxi.
/// [SmmServiceTile] skeleti — xuddi shu karta: sarlavha, yorliqlar, narx va «Tanlaş» tugmasi.
class SmmServiceTileSkeleton extends StatelessWidget {
  const SmmServiceTileSkeleton({super.key, this.withLabel = false});
  final bool withLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WebC.cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WebC.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (withLabel) ...const [
            SBar(width: 130, height: 11),
            SizedBox(height: 7),
          ],
          const SBar(height: 15),
          const SizedBox(height: 6),
          const SBar(width: 170, height: 15),
          const SizedBox(height: 12),
          const Row(
            children: [
              SBar(width: 92, height: 22, borderRadius: 99),
              SizedBox(width: 6),
              SBar(width: 110, height: 22, borderRadius: 99),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SBar(width: 96, height: 19),
                    SizedBox(height: 6),
                    SBar(width: 150, height: 11),
                  ],
                ),
              ),
              const SBar(width: 78, height: 38, borderRadius: 12),
            ],
          ),
        ],
      ),
    );
  }
}

class SmmServiceTile extends StatelessWidget {
  const SmmServiceTile({
    super.key,
    required this.s,
    required this.onTap,
    this.label,
  });
  final SmmService s;
  final VoidCallback onTap;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final disc = s.discount > 0;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: WebC.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: disc
                ? const Color(0xFFF43F5E).withValues(alpha: 0.45)
                : WebC.cardBorder,
            width: disc ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (label != null) ...[
              Text(
                label!,
                style: TextStyle(
                  color: WebC.zinc500,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
            ],
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    s.title,
                    style: TextStyle(
                      color: WebC.white,
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      height: 1.3,
                    ),
                  ),
                ),
                if (disc) ...[
                  const SizedBox(width: 8),
                  DiscountBadge(s.discount),
                ],
              ],
            ),
            if (s.tags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 5,
                runSpacing: 5,
                children: [for (final t in s.tags.take(4)) SmmTag(t)],
              ),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                VerdictBadge(ok: s.recommended),
                GuaranteeBadge(label: s.guaranteeLabel, ok: s.guaranteeOk),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            som(s.rate),
                            style: GoogleFonts.spaceGrotesk(
                              color: disc
                                  ? const Color(0xFFF43F5E)
                                  : WebC.white,
                              fontSize: 19,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                          ),
                          if (s.oldRate != null) ...[
                            const SizedBox(width: 6),
                            Text(
                              groupDigits(s.oldRate!),
                              style: TextStyle(
                                color: WebC.zinc500,
                                fontSize: 13,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ],
                      ),
                      Text(
                        'har 1000 tasi uçun · ${groupDigits(s.min)} – ${groupDigits(s.max)} ta',
                        style: TextStyle(color: WebC.zinc500, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFF6366F1),
                        Color(0xFF8B5CF6),
                        Color(0xFFD946EF),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Tanlaş',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Bo'lim sarlavhasi ("1. Platformani tanlang").
class SmmStepTitle extends StatelessWidget {
  const SmmStepTitle(this.n, this.text, {super.key});
  final int n;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        width: 26,
        height: 26,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          ),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Text(
            '$n',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
      const SizedBox(width: 10),
      Text(
        text,
        style: TextStyle(
          color: WebC.white,
          fontSize: 17,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
    ],
  );
}

/// Böş / topilmadi holati — katta Tayyor-Man maskoti (ramkasiz), sarlavha, izoh va (ixtiyoriy) tugma.
class SmmEmpty extends StatelessWidget {
  const SmmEmpty({
    super.key,
    required this.pose,
    required this.title,
    this.text,
    this.action,
  });
  final MascotPose pose;
  final String title;
  final String? text;
  final Widget? action;

  @override
  Widget build(BuildContext context) =>
      MascotState(pose: pose, title: title, message: text, action: action);
}
