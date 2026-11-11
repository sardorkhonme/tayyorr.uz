import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';

import '../../../core/navigation/services.dart';
import '../../../core/navigation/support.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/local_storage.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../data/smm_api.dart';
import '../data/smm_models.dart';
import 'smm_widgets.dart';

/// Tayyorr SMM qo'llanmasi — saytdagi /qollanma (ma'lumot serverdan, bir xil matn).
class SmmGuideScreen extends StatefulWidget {
  const SmmGuideScreen({super.key});

  @override
  State<SmmGuideScreen> createState() => _SmmGuideScreenState();
}

class _SmmGuideScreenState extends State<SmmGuideScreen> {
  SmmGuide? _g;
  String? _error;
  String? _open;

  @override
  void initState() {
    super.initState();
    LocalStorage.instance.setSmmGuideRead();
    _load();
  }

  Future<void> _load() async {
    try {
      final g = await SmmApi.instance.guide();
      if (mounted) setState(() => _g = g);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final g = _g;
    return ServiceScope(
      kind: ServiceKind.smm,
      child: AuroraBackground(
        child: WebPage(
          background: false,
          onRefresh: _load,
          children: [
            Row(children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const TIcon(TI.menu_book_rounded, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Qöllanma', style: TextStyle(color: WebC.white, fontSize: 24, fontWeight: FontWeight.w800)),
                  Text('1 daqiqada öqiladi', style: TextStyle(color: WebC.zinc500, fontSize: 13.5)),
                ]),
              ),
            ]),
            const SizedBox(height: 16),
            _card(
              'Faqat şu yorliqqa qarang',
              sub: 'Har bir xizmat kartasida bittasi turadi.',
              child: Column(children: [
                _label(const Color(0xFF10B981), '♻️ 30 kun kafolat', 'Kamaysa — qayta töldiriladi. Obunaçi uçun şunisini oling.'),
                const SizedBox(height: 8),
                _label(const Color(0xFFF59E0B), '⚠️ Kafolatsiz', 'Arzon, lekin obunaçilar tuşib ketişi mumkin va qaytmaydi.'),
              ]),
            ),
            if (_error != null && g == null)
              SmmEmpty(icon: TI.wifi_off_rounded, title: _error!)
            else if (g == null)
              const SBlock(height: 240)
            else ...[
              _card(
                '${g.rules.length} ta qoida',
                child: Column(children: [
                  for (final r in g.rules)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(r.$1, style: const TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Expanded(child: Text(r.$2, style: TextStyle(color: WebC.zinc300, fontSize: 14.5, height: 1.45))),
                      ]),
                    ),
                ]),
              ),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.9,
                children: [
                  for (final p in g.picks)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: WebC.cardBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: WebC.cardBorder)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(p.$2, style: TextStyle(color: WebC.white, fontSize: 14.5, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text(p.$3, style: TextStyle(color: WebC.zinc400, fontSize: 12.5, height: 1.3)),
                      ]),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              _card(
                'Muammo bölsa',
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _line('💸', 'Bajarilmasa yoki qisman bajarilsa — pul avtomatik qaytadi.'),
                  _line('♻️', 'Kafolatli xizmatda kamaysa — supportga buyurtma raqami bilan yozing.'),
                  _line('⏳', 'Uzoq boşlanmasa — buyurtma sahifasida «Yangilaş»ni bosing.'),
                  const SizedBox(height: 10),
                  Row(children: [
                    Expanded(child: WebButton(label: 'Xizmatlarni tanlaş', onPressed: () => openSmm(0))),
                    const SizedBox(width: 8),
                    Expanded(child: WebButton(label: 'Supportga yoziş', variant: WebBtn.ghost, onPressed: () => openSupportChat(context))),
                  ]),
                ]),
              ),
              Text('Atamalar luğati', style: TextStyle(color: WebC.white, fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Xizmat nomidagi inglizça yozuvlar — kerak bölsa oçib öqing.', style: TextStyle(color: WebC.zinc500, fontSize: 13)),
              const SizedBox(height: 10),
              for (final s in g.sections) _section(s, g.tones),
            ],
          ],
        ),
      ),
    );
  }

  Widget _card(String title, {String? sub, required Widget child}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: WebCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(color: WebC.white, fontSize: 17, fontWeight: FontWeight.w800)),
            if (sub != null) Text(sub, style: TextStyle(color: WebC.zinc500, fontSize: 13)),
            const SizedBox(height: 12),
            child,
          ]),
        ),
      );

  Widget _label(Color c, String tag, String text) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14), border: Border.all(color: c.withValues(alpha: 0.25))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tag, style: TextStyle(color: c, fontSize: 13.5, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(text, style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.4)),
        ]),
      );

  Widget _line(String e, String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(e, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Expanded(child: Text(t, style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45))),
        ]),
      );

  Color _tone(String t) => switch (t) {
        'good' => const Color(0xFF10B981),
        'ok' => const Color(0xFF0EA5E9),
        'bad' => const Color(0xFFF59E0B),
        _ => const Color(0xFFA1A1AA),
      };

  Widget _section(SmmGuideSection s, Map<String, String> tones) {
    final open = _open == s.id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: WebCard(
        padding: const EdgeInsets.all(14),
        onTap: () => setState(() => _open = open ? null : s.id),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s.title, style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w700)),
                Text(s.terms.map((t) => t.names.first).join(', '),
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: WebC.zinc500, fontSize: 12)),
              ]),
            ),
            AnimatedRotation(
              turns: open ? 0.125 : 0,
              duration: const Duration(milliseconds: 200),
              child: TIcon(TI.add_rounded, color: open ? const Color(0xFF818CF8) : WebC.zinc500),
            ),
          ]),
          AnimatedSize(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            child: !open
                ? const SizedBox(width: double.infinity)
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const SizedBox(height: 10),
                    Text(s.lead, style: TextStyle(color: WebC.zinc400, fontSize: 13.5, height: 1.5)),
                    for (final t in s.terms) ...[
                      Divider(color: WebC.border, height: 22),
                      Wrap(spacing: 5, runSpacing: 5, children: [for (final n in t.names) SmmTag(n)]),
                      const SizedBox(height: 6),
                      Row(children: [
                        Container(width: 8, height: 8, decoration: BoxDecoration(color: _tone(t.tone), shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Expanded(child: Text(t.title, style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w700))),
                        Text(tones[t.tone] ?? '', style: TextStyle(color: _tone(t.tone), fontSize: 11.5, fontWeight: FontWeight.w700)),
                      ]),
                      const SizedBox(height: 4),
                      Text(t.text, style: TextStyle(color: WebC.zinc400, fontSize: 13.5, height: 1.5)),
                    ],
                  ]),
          ),
        ]),
      ),
    );
  }
}
