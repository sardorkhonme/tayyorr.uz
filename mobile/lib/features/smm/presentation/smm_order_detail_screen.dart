import 'package:tayyorr_app/core/ui/ticons.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../../core/navigation/support.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/realtime/realtime_service.dart';
import '../../../core/ui/app_dialogs.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../../core/navigation/services.dart';
import '../data/smm_api.dart';
import '../data/smm_models.dart';
import 'smm_orders_screen.dart';
import 'smm_widgets.dart';

final _dt = DateFormat('dd.MM.yyyy HH:mm');

/// SMM buyurtma tafsiloti (saytdagi /orders/[id]).
class SmmOrderDetailScreen extends StatefulWidget {
  const SmmOrderDetailScreen({super.key, required this.id});
  final String id;

  @override
  State<SmmOrderDetailScreen> createState() => _SmmOrderDetailScreenState();
}

class _SmmOrderDetailScreenState extends State<SmmOrderDetailScreen> {
  SmmOrderDetail? _d;
  String? _error;
  bool _refreshing = false;
  StreamSubscription<RealtimeEvent>? _rt;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _rt = RealtimeService.instance.events.listen((e) {
      if (e.name == 'order') _load();
    });
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_d?.order.active ?? false) _load();
    });
  }

  @override
  void dispose() {
    _rt?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await SmmApi.instance.order(widget.id);
      if (mounted) setState(() => _d = d);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _refresh() async {
    setState(() => _refreshing = true);
    try {
      await SmmApi.instance.refresh(widget.id);
      await _load();
      if (mounted) showToast(context, 'Yangilandi', kind: ToastKind.success);
    } on ApiException catch (e) {
      if (mounted) showToast(context, e.message.isEmpty ? 'Yangilab bölmadi' : e.message, kind: ToastKind.error);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _d;
    return ServiceScope(
      kind: ServiceKind.smm,
      child: AuroraBackground(
        child: WebPage(
          background: false,
          onRefresh: _load,
          children: [
            if (_error != null && d == null)
              SmmEmpty(icon: TI.error_outline_rounded, title: _error!)
            else if (d == null) ..._skeleton()
            else ..._body(d),
          ],
        ),
      ),
    );
  }

  /// Haqiqiy [_body] tuzilmasi: gradient sarlavha, bajarilish halqasi, 2×3 statistika, havola kartasi.
  List<Widget> _skeleton() => [
        const Skel(height: 128, borderRadius: 24),
        const SizedBox(height: 14),
        const WebCard(
          child: Row(children: [
            SCircle(size: 92),
            SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SBar(width: 110, height: 18),
                SizedBox(height: 8),
                SBar(height: 12),
                SizedBox(height: 6),
                SBar(width: 140, height: 12),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 2.1,
          children: [
            for (var i = 0; i < 6; i++)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: WebC.cardBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: WebC.cardBorder)),
                child: const Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  SBar(width: 70, height: 10),
                  SizedBox(height: 6),
                  SBar(width: 90, height: 16),
                ]),
              ),
          ],
        ),
        const SizedBox(height: 12),
        const SBlock(height: 120),
      ];

  List<Widget> _body(SmmOrderDetail d) {
    final o = d.order;
    final c = SmmPlatformSquare.colors[o.platform] ?? (const Color(0xFF6366F1), const Color(0xFF4F46E5));
    return [
      // sarlavha (platforma gradienti)
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [c.$1, c.$2]),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${o.platformName} · ${o.kindLabel}', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(o.title, style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800, height: 1.3)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: Text('Buyurtma #${o.code} · ${_dt.format(o.createdAt)}', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12.5)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99)),
              child: Text(o.statusLabel, style: TextStyle(color: o.statusColor, fontSize: 12, fontWeight: FontWeight.w800)),
            ),
          ]),
        ]),
      ),
      const SizedBox(height: 14),
      // bajarilish
      WebCard(
        child: Column(children: [
          Row(children: [
            SizedBox(
              width: 92,
              height: 92,
              child: Stack(alignment: Alignment.center, children: [
                SizedBox(
                  width: 92,
                  height: 92,
                  child: CircularProgressIndicator(
                    value: o.failed ? 1 : o.pct / 100,
                    strokeWidth: 8,
                    strokeCap: StrokeCap.round,
                    backgroundColor: WebC.fill10,
                    valueColor: AlwaysStoppedAnimation(o.failed ? const Color(0xFFF43F5E) : c.$2),
                  ),
                ),
                Column(mainAxisSize: MainAxisSize.min, children: [
                  Text('${o.pct}%', style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w800)),
                  Text('bajarildi', style: TextStyle(color: WebC.zinc500, fontSize: 10.5)),
                ]),
              ]),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${groupDigitsSafe(o.delivered)} / ${groupDigitsSafe(o.quantity)}',
                    style: TextStyle(color: WebC.white, fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(o.statusHint, style: TextStyle(color: WebC.zinc400, fontSize: 13, height: 1.4)),
                if (o.refund > 0) ...[
                  const SizedBox(height: 6),
                  Text('Hamyonga qaytarildi: ${som(o.refund)}', style: TextStyle(color: WebC.emerald, fontSize: 13, fontWeight: FontWeight.w700)),
                ],
              ]),
            ),
          ]),
          if (o.active) ...[
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: Text(
                  o.checkedAt == null ? 'Hali tekşirilmagan' : 'Oxirgi tekşiruv: ${_dt.format(o.checkedAt!)}',
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
              ),
              WebButton(label: _refreshing ? 'Yangilanmoqda…' : 'Yangilaş', small: true, leading: TI.refresh_rounded, onPressed: _refreshing ? null : _refresh),
            ]),
          ],
        ]),
      ),
      const SizedBox(height: 12),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 2.1,
        children: [
          _stat('Buyurtma', '${groupDigitsSafe(o.quantity)} ta', o.kindLabel),
          _stat('Yetkazildi', groupDigitsSafe(o.delivered), '${o.pct}%'),
          _stat('Qoldi', groupDigitsSafe(o.left), o.active ? 'yetkazilmoqda' : (o.left > 0 ? 'puli qaytarildi' : '—')),
          _stat('Boşlanişida', o.startCount == null ? '—' : groupDigitsSafe(o.startCount!), 'buyurtmagaça'),
          _stat('Hozir taxminan', o.expected == null ? '—' : groupDigitsSafe(o.expected!), 'sahifada'),
          _stat('1000 tasi narxi', o.quantity > 0 ? som((o.charge * 1000 / o.quantity).round()) : '—', 'jami ${som(o.charge)}'),
        ],
      ),
      const SizedBox(height: 12),
      _timeline(o),
      const SizedBox(height: 12),
      WebCard(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Havola', style: TextStyle(color: WebC.zinc500, fontSize: 12.5, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          GestureDetector(
            onLongPress: () {
              Clipboard.setData(ClipboardData(text: o.link));
              showToast(context, 'Havola nusxalandi', kind: ToastKind.success);
            },
            child: Text(o.link, style: TextStyle(color: WebC.indigo, fontSize: 14)),
          ),
          const SizedBox(height: 12),
          Text('Xizmat haqida', style: TextStyle(color: WebC.zinc500, fontSize: 12.5, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Wrap(spacing: 6, runSpacing: 6, children: [
            GuaranteeBadge(label: o.guaranteeLabel, ok: o.guaranteeOk),
            for (final t in o.tags) SmmTag(t),
          ]),
        ]),
      ),
      if (d.txns.isNotEmpty) ...[
        const SizedBox(height: 12),
        WebCard(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Hamyon', style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            for (final t in d.txns)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(children: [
                  TIcon(t.type == 'REFUND' ? TI.south_west_rounded : TI.north_east_rounded,
                      size: 16, color: t.type == 'REFUND' ? WebC.emerald : WebC.zinc400),
                  const SizedBox(width: 8),
                  Expanded(child: Text(t.type == 'REFUND' ? 'Qaytarildi' : 'Tölandi', style: TextStyle(color: WebC.zinc300, fontSize: 13.5))),
                  Text('${t.type == 'REFUND' ? '+' : '−'}${som(t.amount)}',
                      style: TextStyle(color: t.type == 'REFUND' ? WebC.emerald : WebC.white, fontSize: 13.5, fontWeight: FontWeight.w700)),
                ]),
              ),
            Divider(color: WebC.border),
            Row(children: [
              Text('Jami sarflandi', style: TextStyle(color: WebC.zinc400, fontSize: 13.5)),
              const Spacer(),
              Text(som(o.charge - o.refund), style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w800)),
            ]),
          ]),
        ),
      ],
      const SizedBox(height: 12),
      WebCard(
        child: Row(children: [
          const TIcon(TI.support_agent_rounded, color: Color(0xFF10B981), size: 26),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Buyurtma bilan muammo bormi?', style: TextStyle(color: WebC.white, fontSize: 14.5, fontWeight: FontWeight.w700)),
              Text('Buyurtma raqami: #${o.code}', style: TextStyle(color: WebC.zinc500, fontSize: 12.5)),
            ]),
          ),
          WebButton(label: 'Yoziş', small: true, onPressed: () => openSupportChat(context)),
        ]),
      ),
    ];
  }

  Widget _stat(String label, String value, String sub) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WebC.cardBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: WebC.cardBorder)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(label, style: TextStyle(color: WebC.zinc500, fontSize: 11.5)),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: TextStyle(color: WebC.white, fontSize: 17, fontWeight: FontWeight.w800)),
          ),
          Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: WebC.zinc500, fontSize: 11)),
        ]),
      );

  Widget _timeline(SmmOrder o) {
    final finalLabel = switch (o.status) {
      'COMPLETED' => 'Bajarildi',
      'PARTIAL' => 'Qisman bajarildi',
      'CANCELED' => 'Bekor qilindi',
      'FAILED' => 'Xatolik — pul qaytarildi',
      _ => 'Bajarildi',
    };
    final steps = [
      ('Buyurtma berildi', true),
      ('Qabul qilindi', o.accepted || !o.active),
      ('Yetkazilmoqda', o.status == 'IN_PROGRESS' || !o.active),
      (finalLabel, !o.active),
    ];
    return WebCard(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Jarayon', style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        for (var i = 0; i < steps.length; i++)
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Column(children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: steps[i].$2 ? (i == 3 && o.failed ? const Color(0xFFF43F5E) : const Color(0xFF10B981)) : WebC.fill10,
                ),
                child: steps[i].$2 ? TIcon(i == 3 && o.failed ? TI.close_rounded : TI.check_rounded, size: 14, color: Colors.white) : null,
              ),
              if (i < steps.length - 1) Container(width: 2, height: 18, color: steps[i + 1].$2 ? const Color(0xFF10B981) : WebC.fill10),
            ]),
            const SizedBox(width: 10),
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(steps[i].$1, style: TextStyle(color: steps[i].$2 ? WebC.white : WebC.zinc500, fontSize: 14, fontWeight: FontWeight.w600)),
            ),
          ]),
      ]),
    );
  }
}
