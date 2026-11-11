import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';

import '../../../core/network/api_exception.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../data/smm_api.dart';
import '../data/smm_models.dart';
import 'smm_order_sheet.dart';
import 'smm_widgets.dart';

/// Çegirmalar — faqat chegirmadagi xizmatlar, eng kattasidan boshlab; platforma bo'yicha filtr.
class SmmDiscountsScreen extends StatefulWidget {
  const SmmDiscountsScreen({super.key, this.onOrdersTap, this.onAllTap});
  final VoidCallback? onOrdersTap;
  final VoidCallback? onAllTap;

  @override
  State<SmmDiscountsScreen> createState() => _SmmDiscountsScreenState();
}

class _SmmDiscountsScreenState extends State<SmmDiscountsScreen> {
  SmmCatalog? _cat;
  String? _error;
  String? _platform;
  int _shown = 12;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool force = false}) async {
    try {
      final c = await SmmApi.instance.catalog(force: force);
      if (mounted) setState(() => _cat = c);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _cat;
    final all = (c?.services ?? const <SmmService>[]).where((s) => s.discount > 0).toList()
      ..sort((a, b) => b.discount != a.discount ? b.discount.compareTo(a.discount) : a.rate.compareTo(b.rate));
    final platforms = <String>{for (final s in all) s.platform}.toList();
    final items = _platform == null ? all : all.where((s) => s.platform == _platform).toList();

    return WebPage(
      background: false,
      onRefresh: () => _load(force: true),
      children: [
        Row(children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFFF43F5E), Color(0xFFD946EF)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const TIcon(TI.local_offer_rounded, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Çegirmalar', style: TextStyle(color: WebC.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
              Text('Arzonlaşgan xizmatlar — ulgurib qoling', style: TextStyle(color: WebC.zinc500, fontSize: 13)),
            ]),
          ),
        ]),
        const SizedBox(height: 16),
        if (_error != null && c == null)
          SmmEmpty(icon: TI.wifi_off_rounded, title: _error!)
        else if (c == null) ...[for (var i = 0; i < 3; i++) ...const [SmmServiceTileSkeleton(withLabel: true), SizedBox(height: 10)]]
        else if (all.isEmpty)
          SmmEmpty(
            icon: TI.local_offer_outlined,
            title: 'Hozirça çegirmalar yöq',
            text: 'Yangi çegirmalar paydo bölganda şu yerda körinadi.',
            action: WebButton(label: 'Barça xizmatlar', onPressed: widget.onAllTap),
          )
        else ...[
          if (platforms.length > 1) ...[
            SizedBox(
              height: 36,
              child: ListView(scrollDirection: Axis.horizontal, children: [
                _chip('Hammasi', _platform == null, () => setState(() => _platform = null)),
                for (final p in platforms) _chip(c.platform(p).name, _platform == p, () => setState(() => _platform = p)),
              ]),
            ),
            const SizedBox(height: 12),
          ],
          for (final s in items.take(_shown)) ...[
            SmmServiceTile(
              s: s,
              label: '${c.platform(s.platform).name} · ${c.kind(s.kind).label}',
              onTap: () => showSmmOrderSheet(context, s, c, onOrdersTap: widget.onOrdersTap),
            ),
            const SizedBox(height: 10),
          ],
          if (items.length > _shown)
            WebButton(label: 'Yana körsatiş (${items.length - _shown})', variant: WebBtn.ghost, expand: true, onPressed: () => setState(() => _shown += 12)),
        ],
      ],
    );
  }

  Widget _chip(String label, bool on, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(right: 6),
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: on ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]) : null,
              color: on ? null : WebC.fill5,
              borderRadius: BorderRadius.circular(99),
              border: on ? null : Border.all(color: WebC.border),
            ),
            child: Text(label, style: TextStyle(color: on ? Colors.white : WebC.zinc300, fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ),
      );
}
