import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/storage/local_storage.dart';
import '../../../core/ui/platform_icon.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../data/smm_api.dart';
import '../data/smm_models.dart';
import 'smm_guide_screen.dart';
import 'smm_order_sheet.dart';
import 'smm_widgets.dart';

/// Tayyorr SMM — xizmatlar: 1) platforma, 2) nima kerak (tur), 3) xizmat (arzonidan).
class SmmCatalogScreen extends StatefulWidget {
  const SmmCatalogScreen({super.key, this.onOrdersTap, this.onDiscountsTap});
  final VoidCallback? onOrdersTap;
  final VoidCallback? onDiscountsTap;

  @override
  State<SmmCatalogScreen> createState() => _SmmCatalogScreenState();
}

class _SmmCatalogScreenState extends State<SmmCatalogScreen> {
  SmmCatalog? _cat;
  String? _error;
  String? _platform;
  String? _kind;
  String _q = '';
  int _shown = 12;
  final _listKey = GlobalKey();
  final _kindKey = GlobalKey();

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

  void _scrollTo(GlobalKey k) => WidgetsBinding.instance.addPostFrameCallback((_) {
        final ctx = k.currentContext;
        if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic, alignment: 0.05);
      });

  @override
  Widget build(BuildContext context) {
    final c = _cat;
    return WebPage(
      background: false,
      onRefresh: () => _load(force: true),
      children: [
        _header(),
        const SizedBox(height: 14),
        _GuideBanner(onOpen: () async {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SmmGuideScreen()));
          if (mounted) setState(() {});
        }),
        if (_error != null && c == null) ...[
          const SizedBox(height: 14),
          SmmEmpty(
            icon: TI.wifi_off_rounded,
            title: _error!,
            action: WebButton(label: 'Qayta uriniş', onPressed: () {
              setState(() => _error = null);
              _load(force: true);
            }),
          ),
        ] else if (c == null) ...[
          // haqiqiy ko'rinish: 1-qadam sarlavhasi + 3 ustunli platforma plitkalari
          const SizedBox(height: 22),
          const SmmStepTitle(1, 'Platformani tanlang'),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 0.92,
            // Skel cheklangan balandlik talab qiladi (nur animatsiyasi) — katakning o'lchamini beramiz
            children: [
              for (var i = 0; i < 6; i++)
                LayoutBuilder(builder: (_, box) => Skel(width: box.maxWidth, height: box.maxHeight, borderRadius: 20)),
            ],
          ),
        ] else
          ..._content(c),
      ],
    );
  }

  Widget _header() => Row(children: [
        Container(
          width: 52,
          height: 52,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.black.withValues(alpha: 0.05))),
          child: Image.asset('assets/smm-mark.png', filterQuality: FilterQuality.high),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Tayyorr SMM', style: TextStyle(color: WebC.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
            Text('Obunaçilar, layklar va körişlar — bir neça daqiqada.', style: TextStyle(color: WebC.zinc500, fontSize: 13, height: 1.35)),
          ]),
        ),
      ]);

  List<Widget> _content(SmmCatalog c) {
    if (c.services.isEmpty) {
      return const [SizedBox(height: 14), SmmEmpty(icon: TI.hourglass_empty_rounded, title: 'Xizmatlar tez orada qöşiladi')];
    }
    final maxDisc = c.services.fold<int>(0, (m, s) => s.discount > m ? s.discount : m);
    final discCount = c.services.where((s) => s.discount > 0).length;
    final byPlatform = <String, List<SmmService>>{};
    for (final s in c.services) {
      (byPlatform[s.platform] ??= []).add(s);
    }
    final platforms = c.platforms.where((p) => p.key != 'other' || (byPlatform['other']?.isNotEmpty ?? false)).toList();

    final out = <Widget>[];
    if (maxDisc > 0) {
      out
        ..add(const SizedBox(height: 12))
        ..add(_SaleBanner(max: maxDisc, count: discCount, onTap: widget.onDiscountsTap));
    }
    out
      ..add(const SizedBox(height: 22))
      ..add(const SmmStepTitle(1, 'Platformani tanlang'))
      ..add(const SizedBox(height: 12))
      ..add(GridView.count(
        crossAxisCount: 3,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.92,
        children: [
          for (final p in platforms)
            _PlatformTile(
              p: p,
              count: byPlatform[p.key]?.length ?? 0,
              maxDiscount: (byPlatform[p.key] ?? const []).fold<int>(0, (m, s) => s.discount > m ? s.discount : m),
              selected: _platform == p.key,
              onTap: () {
                setState(() {
                  _platform = p.key;
                  _kind = null;
                  _q = '';
                  _shown = 12;
                });
                _scrollTo(_kindKey);
              },
            ),
        ],
      ));

    final pl = _platform;
    if (pl != null) {
      final list = byPlatform[pl] ?? const [];
      final kinds = <String, List<SmmService>>{};
      for (final s in list) {
        (kinds[s.kind] ??= []).add(s);
      }
      out
        ..add(SizedBox(key: _kindKey, height: 24))
        ..add(const SmmStepTitle(2, 'Nima kerak?'))
        ..add(const SizedBox(height: 12));
      for (final k in c.kinds.where((k) => kinds.containsKey(k.key))) {
        final ks = kinds[k.key]!;
        final kd = ks.fold<int>(0, (m, s) => s.discount > m ? s.discount : m);
        out
          ..add(_KindTile(
            k: k,
            count: ks.length,
            maxDiscount: kd,
            selected: _kind == k.key,
            onTap: () {
              setState(() {
                _kind = k.key;
                _q = '';
                _shown = 12;
              });
              _scrollTo(_listKey);
            },
          ))
          ..add(const SizedBox(height: 8));
      }

      final kd = _kind;
      if (kd != null) {
        var items = (kinds[kd] ?? const []).toList()..sort((a, b) => a.rate.compareTo(b.rate));
        if (_q.trim().isNotEmpty) {
          final q = _q.trim().toLowerCase();
          items = items.where((s) => s.title.toLowerCase().contains(q) || s.category.toLowerCase().contains(q)).toList();
        }
        out
          ..add(SizedBox(key: _listKey, height: 20))
          ..add(const SmmStepTitle(3, 'Xizmatni tanlang'))
          ..add(const SizedBox(height: 4))
          ..add(Text('Eng arzonidan boşlab. Kafolat yorliğiga qarang.', style: TextStyle(color: WebC.zinc500, fontSize: 13)))
          ..add(const SizedBox(height: 10))
          ..add(WebInput(
            hint: 'Röyxatdan qidiriş…',
            onChanged: (v) => setState(() {
              _q = v;
              _shown = 12;
            }),
            suffix: TIcon(TI.search_rounded, size: 18, color: WebC.zinc500),
          ))
          ..add(const SizedBox(height: 12));
        if (items.isEmpty) {
          out.add(const SmmEmpty(icon: TI.search_off_rounded, title: 'Hec nima topilmadi'));
        }
        for (final s in items.take(_shown)) {
          out
            ..add(SmmServiceTile(s: s, onTap: () => showSmmOrderSheet(context, s, c, onOrdersTap: widget.onOrdersTap)))
            ..add(const SizedBox(height: 10));
        }
        if (items.length > _shown) {
          out.add(WebButton(
            label: 'Yana körsatiş (${items.length - _shown})',
            variant: WebBtn.ghost,
            expand: true,
            onPressed: () => setState(() => _shown += 12),
          ));
        }
      }
    }
    return out;
  }
}

class _PlatformTile extends StatelessWidget {
  const _PlatformTile({required this.p, required this.count, required this.maxDiscount, required this.selected, required this.onTap});
  final SmmPlatform p;
  final int count;
  final int maxDiscount;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final disabled = count == 0;
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        decoration: BoxDecoration(
          gradient: p.gradient,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? Colors.white : Colors.transparent, width: 2.5),
          boxShadow: selected ? [BoxShadow(color: p.to.withValues(alpha: 0.5), blurRadius: 20, offset: const Offset(0, 8), spreadRadius: -6)] : null,
        ),
        foregroundDecoration: disabled ? BoxDecoration(color: Colors.white.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(20)) : null,
        child: Stack(children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              PlatformIconBox(p.key),
              const Spacer(),
              Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800)),
              Text(disabled ? 'Tez orada' : '$count ta xizmat', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 11.5)),
            ]),
          ),
          if (maxDiscount > 0)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99)),
                child: Text('−$maxDiscount%', style: const TextStyle(color: Color(0xFFE11D48), fontSize: 10.5, fontWeight: FontWeight.w800)),
              ),
            ),
        ]),
      ),
    );
  }
}

/// Platforma belgisi oq shaffof kvadratda (gradient plitka ustida).
class PlatformIconBox extends StatelessWidget {
  const PlatformIconBox(this.platform, {super.key});
  final String platform;

  @override
  Widget build(BuildContext context) => Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.22), borderRadius: BorderRadius.circular(12)),
        child: Center(child: PlatformIcon(platform, size: 20)),
      );
}

class _KindTile extends StatelessWidget {
  const _KindTile({required this.k, required this.count, required this.maxDiscount, required this.selected, required this.onTap});
  final SmmKind k;
  final int count;
  final int maxDiscount;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? k.color.withValues(alpha: 0.12) : WebC.cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: selected ? k.color : WebC.cardBorder, width: selected ? 1.6 : 1),
        ),
        child: Row(children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: k.color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
            child: TIcon(k.icon, color: k.color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(k.label, style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w700)),
              Text(k.hint, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: WebC.zinc500, fontSize: 12.5)),
            ]),
          ),
          if (maxDiscount > 0) ...[DiscountBadge(maxDiscount), const SizedBox(width: 6)],
          Text('$count', style: TextStyle(color: WebC.zinc400, fontSize: 13, fontWeight: FontWeight.w700)),
          TIcon(TI.chevron_right_rounded, color: WebC.zinc500),
        ]),
      ),
    );
  }
}

class _GuideBanner extends StatefulWidget {
  const _GuideBanner({required this.onOpen});
  final VoidCallback onOpen;

  @override
  State<_GuideBanner> createState() => _GuideBannerState();
}

class _GuideBannerState extends State<_GuideBanner> {
  VoidCallback get onOpen => widget.onOpen;

  @override
  Widget build(BuildContext context) {
    final read = LocalStorage.instance.smmGuideRead;
    if (read) {
      return GestureDetector(
        onTap: onOpen,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(color: WebC.fill5, borderRadius: BorderRadius.circular(14), border: Border.all(color: WebC.border)),
          child: Row(children: [
            const TIcon(TI.menu_book_rounded, size: 18, color: Color(0xFF818CF8)),
            const SizedBox(width: 10),
            Expanded(child: Text("Qöllanma — qaysi xizmatni oliş kerak?", style: TextStyle(color: WebC.zinc300, fontSize: 13.5))),
            TIcon(TI.chevron_right_rounded, color: WebC.zinc500),
          ]),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(colors: [const Color(0xFFF59E0B).withValues(alpha: 0.18), const Color(0xFFF97316).withValues(alpha: 0.12)]),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('📖', style: TextStyle(fontSize: 22)),
          const SizedBox(width: 8),
          Expanded(
            child: Text('Qöllanmani öqimasdan buyurtma bermang!', style: TextStyle(color: WebC.white, fontSize: 15.5, fontWeight: FontWeight.w800)),
          ),
        ]),
        const SizedBox(height: 6),
        Text('1 daqiqada: kafolat yorliği, 3 ta qoida va qaysi xizmatni oliş kerakligi.',
            style: TextStyle(color: WebC.zinc400, fontSize: 13, height: 1.4)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: WebButton(label: 'Qöllanmani öqiş', onPressed: onOpen)),
          const SizedBox(width: 8),
          WebButton(
            label: 'Öqidim',
            variant: WebBtn.ghost,
            onPressed: () async {
              await LocalStorage.instance.setSmmGuideRead();
              if (mounted) setState(() {});
            },
          ),
        ]),
      ]),
    );
  }
}

class _SaleBanner extends StatelessWidget {
  const _SaleBanner({required this.max, required this.count, this.onTap});
  final int max;
  final int count;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(colors: [Color(0xFFF43F5E), Color(0xFFD946EF), Color(0xFF8B5CF6)]),
          boxShadow: [BoxShadow(color: const Color(0xFFF43F5E).withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 10), spreadRadius: -10)],
        ),
        child: Row(children: [
          const TIcon(TI.local_offer_rounded, color: Colors.white, size: 26),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('−$max% gaça çegirmalar!', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
              Text('$count ta xizmat arzonlaşdi — ulgurib qoling', style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12.5)),
            ]),
          ),
          const TIcon(TI.arrow_forward_rounded, color: Colors.white),
        ]),
      ),
    );
  }
}
