import 'package:flutter/material.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../core/navigation/services.dart';
import '../../widgets/web_page.dart';
import '../../widgets/web_ui.dart';
import '../smm/presentation/smm_guide_screen.dart';
import 'guide_screen.dart';

/// tayyorr+ → «Qöllanma»: platformalar röyxati; bosilganda şu platformaning qöllanmasi oçiladi.
class GuideHubScreen extends StatelessWidget {
  const GuideHubScreen({super.key});

  static const _items = [
    _Platform(
      logo: 'assets/logo-mark.png',
      title: 'Tayyorr.uz',
      subtitle: 'Buyurtma beriş, tayyorlaş, takliflar va xabarlar',
      kind: 0,
    ),
    _Platform(
      logo: 'assets/smm-mark.png',
      title: 'Tayyorr SMM',
      subtitle: 'Obunaçi, layk, körişlar — buyurtma berişdan natijagaça',
      kind: 1,
    ),
  ];

  void _open(BuildContext context, int kind) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => kind == 0 ? const GuideScreen() : const SmmGuideScreen(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final root = ShellRootScope.of(context) != null;
    return WebPage(
      background: !root,
      children: [
        if (!root) const WebBackLink(),
        const SizedBox(height: 8),
        const WebPageTitle('Qöllanma', subtitle: 'Platformani tanlang — qanday işlaşini qadamma-qadam körsatamiz.'),
        const SizedBox(height: 18),
        for (final p in _items) ...[
          WebCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            onTap: () => _open(context, p.kind),
            child: Row(children: [
              Container(
                width: 44,
                height: 44,
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: WebC.fill10,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Image.asset(p.logo, fit: BoxFit.contain),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p.title, style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(p.subtitle, style: TextStyle(color: WebC.zinc400, fontSize: 12.5, height: 1.35)),
                ]),
              ),
              const SizedBox(width: 8),
              TIcon(TI.chevron_right_rounded, size: 18, color: WebC.zinc500),
            ]),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _Platform {
  final String logo;
  final String title;
  final String subtitle;
  final int kind;
  const _Platform({required this.logo, required this.title, required this.subtitle, required this.kind});
}
