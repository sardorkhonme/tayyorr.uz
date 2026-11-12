import 'package:flutter/material.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/utils/format.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_ui.dart';
import '../data/order_model.dart';

/// Buyurtma holatining rangi (ro'yxat va tafsilot sahifasida bir xil).
Color orderStatusColor(String status) => switch (status) {
  'OPEN' => WebC.emerald,
  'IN_PROGRESS' => WebC.indigo,
  'DELIVERED' => WebC.amber,
  'CANCELLED' => WebC.red,
  _ => WebC.zinc400,
};

/// Holat yorlig'i — 24px balandlik, rangli nuqta + matn.
class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({
    super.key,
    required this.status,
    this.deleted = false,
  });
  final String status;
  final bool deleted;

  @override
  Widget build(BuildContext context) {
    final color = deleted ? WebC.red : orderStatusColor(status);
    final label = deleted ? "Öçirilgan" : (kOrderStatusLabel[status] ?? status);
    return Container(
      height: 24,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            maxLines: 1,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Ro'yxat ustidagi bölim sarlavhasi: nom + öngda son.
class ListHeading extends StatelessWidget {
  const ListHeading({super.key, required this.title, this.count});
  final String title;
  final String? count;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 28,
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: WebC.white,
                fontSize: 20,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.3,
              ),
            ),
          ),
          if (count != null)
            Text(count!, style: TextStyle(color: WebC.zinc500, fontSize: 13)),
        ],
      ),
    );
  }
}

/// Buyurtma kartasi: 1-qator — sarlavha; 2-qator — tur · byudjet; 3-qator — holat, vaqt, takliflar soni.
class OrderListTile extends StatelessWidget {
  const OrderListTile({super.key, required this.order, required this.onTap});
  final OrderModel order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final o = order;
    final meta = [
      kOrderTypeLabel[o.type] ?? o.type,
      if ((o.budget ?? 0) > 0) "${groupDigits(o.budget!)} söm",
      if (o.ordererLabel != null) '@${o.ordererLabel}',
    ].join(' · ');
    return WebCard(
      onTap: onTap,
      opacity: o.deleted ? 0.7 : 1,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            o.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: WebC.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            meta,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: WebC.zinc400, fontSize: 13),
          ),
          if (o.deleted && (o.deleteReason ?? '').isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Sabab: ${o.deleteReason}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: WebC.redSoft, fontSize: 12),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              OrderStatusChip(status: o.status, deleted: o.deleted),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  timeAgo(o.createdAt),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
              ),
              TIcon(TI.back_hand_outlined, size: 14, color: WebC.zinc500),
              const SizedBox(width: 4),
              Text(
                '${o.offers} taklif',
                style: TextStyle(
                  color: WebC.zinc400,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// [OrderListTile] skeleti.
class OrderListTileSkeleton extends StatelessWidget {
  const OrderListTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const WebCard(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SBar(width: 220, height: 16),
          SizedBox(height: 8),
          SBar(width: 150, height: 12),
          SizedBox(height: 14),
          Row(
            children: [
              SBar(width: 72, height: 22, borderRadius: 99),
              SizedBox(width: 8),
              SBar(width: 60, height: 11),
              Spacer(),
              SBar(width: 56, height: 11),
            ],
          ),
        ],
      ),
    );
  }
}

/// Röyxat bösh / xato / topilmadi holati — markazda ikonka va matn.
class ListMessage extends StatelessWidget {
  const ListMessage({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });
  final TIData icon;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return WebCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: WebC.fill5,
              shape: BoxShape.circle,
            ),
            child: TIcon(icon, size: 22, color: WebC.zinc400),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: WebC.white,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: TextStyle(color: WebC.zinc500, fontSize: 13, height: 1.4),
            ),
          ],
        ],
      ),
    );
  }
}
