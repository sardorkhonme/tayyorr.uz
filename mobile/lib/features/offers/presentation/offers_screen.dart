import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/skeleton.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../cubit/offers_cubit.dart';
import '../data/offer_model.dart';
import '../data/offers_repository.dart';

/// Tayyorlovchi yuborgan takliflari ro'yxati — "Profil" o'rnida
/// pastki navbardan ochiladi.
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

class _OffersView extends StatelessWidget {
  const _OffersView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: () => context.read<OffersCubit>().load(),
        color: AppColors.indigo,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          slivers: [
            const AppHeaderSliver(),
            BlocBuilder<OffersCubit, OffersState>(
              builder: (context, state) {
                if (state.status == OffersStatus.loading && state.offers.isEmpty) {
                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    sliver: SliverList.list(children: const [
                      SCard(),
                      SizedBox(height: 10),
                      SCard(),
                      SizedBox(height: 10),
                      SCard(),
                    ]),
                  );
                }
                if (state.status == OffersStatus.failure && state.offers.isEmpty) {
                  return SliverFillRemaining(
                    child: Center(
                      child: Text(state.error ?? 'Xatolik', style: const TextStyle(color: AppColors.textMuted)),
                    ),
                  );
                }
                if (state.offers.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Text("Hali taklif yubormagansiz", style: TextStyle(color: AppColors.textMuted)),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  sliver: SliverList.separated(
                    itemCount: state.offers.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) => _OfferCard(offer: state.offers[i]),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({required this.offer});
  final OfferModel offer;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: offer.order.id)),
      ),
      child: GlassCard(
      blur: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  offer.order.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                ),
              ),
              _OfferStatusBadge(status: offer.status),
            ],
          ),
          if ((offer.message ?? '').isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              offer.message!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Text(formatSom(offer.price), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              Text(' · ', style: TextStyle(color: AppColors.textFaint)),
              Text(
                offer.order.deleted ? "O'chirilgan buyurtma" : (kOrderStatusOf(offer.order.status)),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
              const Spacer(),
              Text(timeAgo(offer.createdAt), style: TextStyle(color: AppColors.textFaint, fontSize: 11.5)),
            ],
          ),
        ],
      ),
      ),
    );
  }
}

String kOrderStatusOf(String status) {
  const labels = {
    'OPEN': 'Ochiq',
    'IN_PROGRESS': 'Jarayonda',
    'DELIVERED': 'Topshirilgan',
    'DONE': 'Yakunlangan',
    'CANCELLED': 'Bekor qilingan',
  };
  return labels[status] ?? status;
}

class _OfferStatusBadge extends StatelessWidget {
  const _OfferStatusBadge({required this.status});
  final String status;

  Color get _color {
    switch (status) {
      case 'ACCEPTED':
        return AppColors.emerald;
      case 'REJECTED':
        return AppColors.red;
      case 'WITHDRAWN':
        return AppColors.textMuted;
      default:
        return AppColors.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        kOfferStatusLabel[status] ?? status,
        style: TextStyle(color: _color, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}
