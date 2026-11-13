import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/realtime/realtime_service.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/mascot.dart';
import '../../../widgets/web_ui.dart';
import '../data/smm_api.dart';
import '../data/smm_models.dart';
import 'smm_order_detail_screen.dart';
import 'smm_widgets.dart';

final _date = DateFormat('dd.MM HH:mm');

/// Buyurtmalarim — faqat ro'yxat (holat, bajarilish). Real-time "order" signalida yangilanadi.
class SmmOrdersScreen extends StatefulWidget {
  const SmmOrdersScreen({super.key, this.onCatalogTap});
  final VoidCallback? onCatalogTap;

  @override
  State<SmmOrdersScreen> createState() => SmmOrdersScreenState();
}

class SmmOrdersScreenState extends State<SmmOrdersScreen> {
  SmmOrdersData? _data;
  String? _error;
  StreamSubscription<RealtimeEvent>? _rt;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    load();
    _rt = RealtimeService.instance.events.listen((e) {
      if (e.name == 'order' || e.name == 'wallet') load();
    });
    // faol buyurtma bo'lsa — vaqti-vaqti bilan (real-time bo'lmasa ham) holat yangilanadi
    _timer = Timer.periodic(const Duration(seconds: 45), (_) {
      if ((_data?.active ?? 0) > 0) load();
    });
  }

  @override
  void dispose() {
    _rt?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final d = await SmmApi.instance.orders();
      if (mounted) {
        setState(() {
          _data = d;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = friendlyError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    return WebPage(
      background: false,
      onRefresh: load,
      children: [
        Text(
          'Buyurtmalarim',
          style: TextStyle(
            color: WebC.white,
            fontSize: 22,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Holati öz-özidan yangilanib turadi.',
          style: TextStyle(color: WebC.zinc500, fontSize: 13),
        ),
        const SizedBox(height: 16),
        if (_error != null && d == null)
          ErrorState.from(_error, load)
        else if (d == null) ...[
          // haqiqiy ko'rinish: buyurtma qatorlari
          for (var i = 0; i < 4; i++) ...[
            _orderSkeleton(),
            const SizedBox(height: 10),
          ],
        ] else ...[
          if (d.orders.isEmpty)
            SmmEmpty(
              pose: MascotPose.emptyOrders,
              title: 'Hali buyurtma yöq',
              text: 'Xizmatni tanlang — bir neça daqiqada boşlanadi.',
              action: WebButton(
                label: 'Xizmat tanlaş',
                onPressed: widget.onCatalogTap,
              ),
            )
          else
            for (final o in d.orders) ...[
              _OrderRow(o: o, onChanged: load),
              const SizedBox(height: 10),
            ],
        ],
      ],
    );
  }
}

/// [_OrderRow] skeleti.
Widget _orderSkeleton() => Container(
  padding: const EdgeInsets.all(14),
  decoration: BoxDecoration(
    color: WebC.cardBg,
    borderRadius: BorderRadius.circular(18),
    border: Border.all(color: WebC.cardBorder),
  ),
  child: const Column(
    children: [
      Row(
        children: [
          Skel(width: 42, height: 42, borderRadius: 12),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SBar(width: 170, height: 14),
                SizedBox(height: 6),
                SBar(width: 130, height: 11),
              ],
            ),
          ),
          SizedBox(width: 8),
          SBar(width: 64, height: 22, borderRadius: 99),
        ],
      ),
      SizedBox(height: 12),
      SBar(height: 6, borderRadius: 9),
      SizedBox(height: 6),
      Align(
        alignment: Alignment.centerRight,
        child: SBar(width: 60, height: 10),
      ),
    ],
  ),
);

String groupDigitsSafe(int n) => som(n).replaceAll(' söm', '');

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.o, required this.onChanged});
  final SmmOrder o;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => SmmOrderDetailScreen(id: o.id)),
        );
        onChanged();
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WebC.cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: WebC.cardBorder),
        ),
        child: Column(
          children: [
            Row(
              children: [
                SmmPlatformSquare(platform: o.platform),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        o.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: WebC.white,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${groupDigitsSafe(o.quantity)} dona · ${som(o.charge)} · ${_date.format(o.createdAt)}',
                        style: TextStyle(color: WebC.zinc500, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusPill(o: o),
              ],
            ),
            if (!o.failed) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: LinearProgressIndicator(
                  value: o.pct / 100,
                  minHeight: 6,
                  backgroundColor: WebC.fill10,
                  valueColor: AlwaysStoppedAnimation(o.statusColor),
                ),
              ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  '${groupDigitsSafe(o.delivered)} / ${groupDigitsSafe(o.quantity)}',
                  style: TextStyle(color: WebC.zinc500, fontSize: 11.5),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Buyurtma holati yorlig'i.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.o});
  final SmmOrder o;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: o.statusColor.withValues(alpha: 0.14),
      borderRadius: BorderRadius.circular(99),
    ),
    child: Text(
      o.statusLabel,
      style: TextStyle(
        color: o.statusColor,
        fontSize: 11.5,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

/// Platforma kvadrati (katalogsiz — ranglar ma'lum).
class SmmPlatformSquare extends StatelessWidget {
  const SmmPlatformSquare({super.key, required this.platform, this.size = 42});
  final String platform;
  final double size;

  static const colors = <String, (Color, Color)>{
    'instagram': (Color(0xFFF58529), Color(0xFFDD2A7B)),
    'telegram': (Color(0xFF2AABEE), Color(0xFF229ED9)),
    'tiktok': (Color(0xFF25F4EE), Color(0xFFFE2C55)),
    'youtube': (Color(0xFFFF0000), Color(0xFFB31217)),
    'facebook': (Color(0xFF1877F2), Color(0xFF0C56C4)),
    'twitter': (Color(0xFF52525B), Color(0xFF18181B)),
  };

  @override
  Widget build(BuildContext context) {
    final c =
        colors[platform] ?? (const Color(0xFF6366F1), const Color(0xFF4F46E5));
    return PlatformBadge(SmmPlatform(platform, '', c.$1, c.$2, ''), size: size);
  }
}
