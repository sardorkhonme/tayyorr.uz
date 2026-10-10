import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/format.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../dashboard/data/order_model.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../cubit/offers_cubit.dart';
import '../data/offer_model.dart';
import '../data/offers_repository.dart';

const _filters = [
  ('ALL', 'Hammasi'),
  ('OPEN', 'Ochiq'),
  ('IN_PROGRESS', 'Jarayonda'),
  ('DELIVERED', 'Topshirilgan'),
  ('DONE', 'Yakunlangan'),
  ('CANCELLED', 'Bekor qilingan'),
];

/// Saytdagi /offers — "Mening takliflarim".
class OffersScreen extends StatelessWidget {
  const OffersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => OffersCubit(OffersRepository())..load(),
      child: const _OffersView(),
    );
  }
}

class _OffersView extends StatefulWidget {
  const _OffersView();

  @override
  State<_OffersView> createState() => _OffersViewState();
}

class _OffersViewState extends State<_OffersView> {
  String _filter = 'ALL';

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OffersCubit, OffersState>(
      builder: (context, state) {
        final list = state.offers.where((o) => _filter == 'ALL' || o.order.status == _filter).toList();
        final loading = state.status == OffersStatus.loading && state.offers.isEmpty;
        return WebPage(
          background: false,
          onRefresh: () => context.read<OffersCubit>().load(),
          children: [
            const WebPageTitle('Mening takliflarim', size: 20, subtitle: 'Siz yuborgan barcha takliflar (arizalar) shu yerda.'),
            const SizedBox(height: 16),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final f in _filters)
                  GestureDetector(
                    onTap: () => setState(() => _filter = f.$1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _filter == f.$1 ? WebC.indigoFill : WebC.fill5,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(f.$2,
                          style: TextStyle(
                            color: _filter == f.$1 ? WebC.indigoSoft : WebC.zinc400,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          )),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (loading)
              for (var i = 0; i < 3; i++) ...[const SBlock(height: 120), const SizedBox(height: 8)]
            else if (list.isEmpty)
              WebCard(
                child: Text(
                  state.status == OffersStatus.failure ? (state.error ?? "Yuklab bo'lmadi") : 'Bu holatda taklif topilmadi.',
                  style: TextStyle(color: WebC.zinc500, fontSize: 14),
                ),
              )
            else
              for (final o in list) ...[
                _OfferCard(
                  offer: o,
                  onTap: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.order.id)),
                    );
                    if (context.mounted) context.read<OffersCubit>().load();
                  },
                ),
                const SizedBox(height: 8),
              ],
          ],
        );
      },
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({required this.offer, required this.onTap});
  final OfferModel offer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final o = offer;
    final statusColor = o.status == 'ACCEPTED'
        ? WebC.emerald
        : o.status == 'REJECTED'
            ? WebC.red
            : WebC.zinc400;
    return WebCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text.rich(
                      TextSpan(
                        style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w500),
                        children: [
                          TextSpan(text: o.order.title),
                          if (o.order.deleted)
                            TextSpan(
                              text: "  (o'chirilgan)",
                              style: TextStyle(color: WebC.amber, fontSize: 12, fontWeight: FontWeight.w400),
                            ),
                        ],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${kOrderTypeLabel[o.order.type] ?? o.order.type} · ${kOrderStatusLabel[o.order.status] ?? o.order.status}',
                      style: TextStyle(color: WebC.zinc500, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text('${o.starsSpent} ⭐', style: TextStyle(color: WebC.amber, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            runSpacing: 4,
            children: [
              Text.rich(TextSpan(
                style: TextStyle(color: WebC.zinc300, fontSize: 14),
                children: [
                  const TextSpan(text: 'Narx: '),
                  TextSpan(text: "${groupDigits(o.price)} so'm", style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              )),
              Text(kOfferStatusLabel[o.status] ?? o.status, style: TextStyle(color: statusColor, fontSize: 14)),
            ],
          ),
          if ((o.message ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(o.message!, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: WebC.zinc400, fontSize: 14)),
          ],
          const SizedBox(height: 8),
          Text(shortDateTime(o.createdAt), style: TextStyle(color: WebC.zinc600, fontSize: 12)),
        ],
      ),
    );
  }
}
