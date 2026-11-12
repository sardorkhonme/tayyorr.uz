import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../core/theme/app_colors.dart';
import '../../widgets/aurora_background.dart';
import '../../widgets/web_ui.dart';
import 'family_entry.dart';
import 'family_repository.dart';

/// «Guruh haqida»: guruh belgisi, a'zolar / onlayn, qisqa tavsif va guruh qoidalari.
class FamilyInfoScreen extends StatefulWidget {
  const FamilyInfoScreen({super.key, this.members, this.online});
  final int? members;
  final int? online;

  @override
  State<FamilyInfoScreen> createState() => _FamilyInfoScreenState();
}

class _Rule {
  const _Rule(this.icon, this.color, this.text);
  final TIData icon;
  final Color color;
  final String text;
}

const _rules = [
  _Rule(TI.block_rounded, Color(0xFFF43F5E), 'Haqoratli söz işlatmang. Kimdir haqorat qilsa — xabari ustidan şikoyat qiling.'),
  _Rule(TI.favorite_rounded, Color(0xFFEC4899), 'Boşqalarni hurmat qiling.'),
  _Rule(TI.visibility_off_outlined, Color(0xFFF59E0B), 'Uyatsiz söz va kontent tarqatmang.'),
  _Rule(TI.campaign_rounded, Color(0xFF8B5CF6), 'Reklama tarqatmang.'),
  _Rule(TI.back_hand_outlined, Color(0xFF06B6D4), 'Qizlarga noöğrin sözlar bilan gap otmang.'),
  _Rule(TI.shield_rounded, Color(0xFF10B981), 'Boşqalardan şaxsiy maʼlumot yoki ijtimoiy tarmoqdagi profilini sörmang. Sörasa — şikoyat qiling.'),
  _Rule(TI.lock_rounded, Color(0xFF6366F1), 'Qoidani buzganlar guruhga yozişdan çeklanadi.'),
];

class _FamilyInfoScreenState extends State<FamilyInfoScreen> {
  int? _members;
  int? _online;

  @override
  void initState() {
    super.initState();
    _members = widget.members;
    _online = widget.online;
    FamilyRepository.instance.online().then((r) {
      if (!mounted) return;
      setState(() {
        _members = r.members ?? _members;
        _online = r.online ?? _online;
      });
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final pad = MediaQuery.paddingOf(context);
    return Scaffold(
      body: AuroraBackground(
        child: ListView(
          padding: EdgeInsets.fromLTRB(16, pad.top + 8, 16, pad.bottom + 28),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: GestureDetector(
                onTap: () => Navigator.of(context).maybePop(),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: WebC.fill5, border: Border.all(color: WebC.border)),
                  child: TIcon(TI.arrow_back_ios_new_rounded, size: 18, color: WebC.zinc300),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Center(child: FamilyMark(size: 96)),
            const SizedBox(height: 16),
            Text(kFamilyName,
                textAlign: TextAlign.center,
                style: GoogleFonts.spaceGrotesk(color: WebC.white, fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: -0.6)),
            const SizedBox(height: 6),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(_members == null ? 'Umumiy guruh' : '$_members aʼzo', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
              if ((_online ?? 0) > 0) ...[
                Text('  ·  ', style: TextStyle(color: WebC.zinc500, fontSize: 14)),
                Container(width: 7, height: 7, decoration: BoxDecoration(shape: BoxShape.circle, color: WebC.emerald)),
                const SizedBox(width: 5),
                Text('$_online onlayn', style: TextStyle(color: WebC.emerald, fontSize: 14, fontWeight: FontWeight.w600)),
              ],
            ]),
            const SizedBox(height: 18),
            WebCard(
              child: Text(
                'Barça tayyorr aʼzolari uçun umumiy guruh: yangiliklar, savollar, tajriba almaşiş va suhbat. '
                'Guruh faqat mobil ilovada — bir-birimizga yordam beraylik!',
                textAlign: TextAlign.center,
                style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.5),
              ),
            ),
            const SizedBox(height: 24),
            Row(children: [
              TIcon(TI.menu_book_rounded, size: 18, color: WebC.indigoSoft),
              const SizedBox(width: 8),
              Text('Guruh qoidalari', style: TextStyle(color: WebC.white, fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
            ]),
            const SizedBox(height: 12),
            for (var i = 0; i < _rules.length; i++) ...[
              _RuleCard(index: i + 1, rule: _rules[i]),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: AppColors.isLight
                      ? [const Color(0xFFFFF1F2), const Color(0xFFFDF2F8)]
                      : [const Color(0xFF4C1D2E).withValues(alpha: 0.55), const Color(0xFF3B1D4A).withValues(alpha: 0.55)],
                ),
                border: Border.all(color: const Color(0xFFF43F5E).withValues(alpha: 0.3)),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 38,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: const Color(0xFFF43F5E).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                  child: const TIcon(TI.flag_outlined, size: 19, color: Color(0xFFF43F5E)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Qanday şikoyat qilinadi?', style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      'Xabarni bosing → «Şikoyat qiliş» → nima bölganini qisqa yozing. Administrator körib çiqadi.',
                      style: TextStyle(color: WebC.zinc400, fontSize: 13.5, height: 1.45),
                    ),
                  ]),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _RuleCard extends StatelessWidget {
  const _RuleCard({required this.index, required this.rule});
  final int index;
  final _Rule rule;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WebC.cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: WebC.cardBorder),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: rule.color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(12)),
          child: TIcon(rule.icon, size: 20, color: rule.color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text.rich(
              TextSpan(children: [
                TextSpan(text: '$index. ', style: TextStyle(color: rule.color, fontWeight: FontWeight.w800)),
                TextSpan(text: rule.text),
              ]),
              style: TextStyle(color: WebC.zinc200, fontSize: 14, height: 1.45),
            ),
          ),
        ),
      ]),
    );
  }
}
