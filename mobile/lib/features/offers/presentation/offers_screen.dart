import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/mascot.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../dashboard/data/order_model.dart';
import '../../dashboard/presentation/header_tools.dart';
import '../../dashboard/presentation/order_list_widgets.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../cubit/offers_cubit.dart';
import '../data/offer_model.dart';
import '../data/offers_repository.dart';

/// Taklif holati rangi.
Color _offerColor(String status) => switch (status) {
  'ACCEPTED' => WebC.emerald,
  'REJECTED' => WebC.red,
  'PENDING' => WebC.amber,
  _ => WebC.zinc400,
};

/// Saytdagi /offers — "Mening takliflarim". Headerda qidiruv va filtr (buyurtma va taklif holati).
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
  final _search = TextEditingController();
  bool _searching = false;
  String _q = '';
  final Set<String> _orderStatuses = {};
  final Set<String> _offerStatuses = {};
  BuildContext? _anchor;

  bool get _filterActive =>
      _orderStatuses.isNotEmpty || _offerStatuses.isNotEmpty;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<OfferModel> _filtered(List<OfferModel> offers) {
    final needle = _searching ? _q.trim().toLowerCase() : '';
    return offers.where((o) {
      if (_orderStatuses.isNotEmpty &&
          !_orderStatuses.contains(o.order.status)) {
        return false;
      }
      if (_offerStatuses.isNotEmpty && !_offerStatuses.contains(o.status)) {
        return false;
      }
      if (needle.isNotEmpty) {
        final hay =
            '${o.order.title} ${o.message ?? ''} ${kOrderTypeLabel[o.order.type] ?? ''}'
                .toLowerCase();
        if (!hay.contains(needle)) return false;
      }
      return true;
    }).toList();
  }

  void _closeSearch() {
    FocusScope.of(context).unfocus();
    setState(() {
      _searching = false;
      _q = '';
      _search.clear();
    });
  }

  /// Filtr menyusi oçiq — headerdagi ikonka ✕ ga aylanadi.
  bool _filterOpen = false;

  void _openFilter() {
    final anchor = _anchor;
    if (anchor == null || !anchor.mounted) return;
    final offers = context.read<OffersCubit>().state.offers;
    setState(() => _filterOpen = true);
    showHeaderDropdown(
      anchor,
      builder: (menuContext, setMenu) {
        void update(VoidCallback fn) {
          setState(fn);
          setMenu(() {});
        }

        Widget toggle(Set<String> set, String key, String label) =>
            DropdownChip(
              label: label,
              active: set.contains(key),
              onTap: () => update(
                () => set.contains(key) ? set.remove(key) : set.add(key),
              ),
            );

        return DropdownPanel(
          title: 'Filtr',
          resultLabel: 'Körsatiş (${_filtered(offers).length})',
          onReset: _filterActive
              ? () => update(() {
                  _orderStatuses.clear();
                  _offerStatuses.clear();
                })
              : null,
          sections: [
            DropdownSection(
              title: 'Buyurtma holati',
              chips: [
                for (final e in kOrderStatusLabel.entries)
                  toggle(_orderStatuses, e.key, e.value),
              ],
            ),
            DropdownSection(
              title: 'Taklif holati',
              chips: [
                for (final e in kOfferStatusLabel.entries)
                  toggle(_offerStatuses, e.key, e.value),
              ],
            ),
          ],
        );
      },
    ).whenComplete(() {
      if (mounted) setState(() => _filterOpen = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OffersCubit, OffersState>(
      builder: (context, state) {
        final list = _filtered(state.offers);
        final loading =
            (state.status == OffersStatus.loading ||
                state.status == OffersStatus.initial) &&
            state.offers.isEmpty;
        final chips = <(String, VoidCallback)>[
          for (final s in _orderStatuses)
            (
              kOrderStatusLabel[s] ?? s,
              () => setState(() => _orderStatuses.remove(s)),
            ),
          for (final s in _offerStatuses)
            (
              kOfferStatusLabel[s] ?? s,
              () => setState(() => _offerStatuses.remove(s)),
            ),
        ];
        return PopScope(
          canPop: !_searching,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop && _searching) _closeSearch();
          },
          child: WebPage(
            background: false,
            onRefresh: () => context.read<OffersCubit>().load(),
            headerTrailing: Builder(
              builder: (ctx) {
                _anchor = ctx;
                return HeaderIconGroup(
                  items: [
                    HeaderIconItem(
                      icon: TI.search_rounded,
                      label: 'Qidiriş',
                      onTap: () => setState(() => _searching = true),
                    ),
                    HeaderIconItem(
                      icon: _filterOpen ? TI.close_rounded : TI.tune_rounded,
                      label: 'Filtr',
                      onTap: _openFilter,
                      active: _filterActive,
                      badge: _filterActive,
                    ),
                  ],
                );
              },
            ),
            headerReplace: _searching
                ? HeaderSearchField(
                    controller: _search,
                    hint: 'Buyurtma nomi yoki xabar…',
                    onChanged: (v) => setState(() => _q = v),
                    onClose: _closeSearch,
                  )
                : null,
            children: [
              ListHeading(
                title: _searching
                    ? (_q.trim().isEmpty ? 'Qidiriş' : 'Qidiruv natijalari')
                    : 'Mening takliflarim',
                count: loading ? null : '${list.length} ta',
              ),
              if (!_searching) ...[
                const SizedBox(height: 4),
                Text(
                  'Siz yuborgan barça takliflar (arizalar).',
                  style: TextStyle(
                    color: WebC.zinc500,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
              if (chips.isNotEmpty) ...[
                const SizedBox(height: 12),
                ActiveFilterChips(
                  items: chips,
                  onClearAll: () => setState(() {
                    _orderStatuses.clear();
                    _offerStatuses.clear();
                  }),
                ),
              ],
              const SizedBox(height: 12),
              if (loading)
                for (var i = 0; i < 4; i++) ...[
                  const _OfferCardSkeleton(),
                  const SizedBox(height: 12),
                ]
              else if (list.isEmpty)
                state.status == OffersStatus.failure
                    ? ErrorState.from(
                        state.error,
                        () => context.read<OffersCubit>().load(),
                      )
                    : state.offers.isEmpty
                    ? const ListMessage(
                        pose: MascotPose.emptyOffers,
                        title: "Hali taklif yuborilmagan",
                        subtitle:
                            "Asosiy bölimdagi buyurtmaga narx taklif qiling — u şu yerda körinadi.",
                      )
                    : const ListMessage(
                        pose: MascotPose.noResults,
                        title: 'Mos taklif topilmadi',
                        subtitle: "Filtr yoki qidiruvni özgartirib köring.",
                      )
              else
                for (final o in list) ...[
                  _OfferCard(
                    offer: o,
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              OrderDetailScreen(orderId: o.order.id),
                        ),
                      );
                      if (context.mounted) {
                        context.read<OffersCubit>().load();
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                ],
            ],
          ),
        );
      },
    );
  }
}

/// [_OfferCard] skeleti.
class _OfferCardSkeleton extends StatelessWidget {
  const _OfferCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return const WebCard(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: SBar(width: 190, height: 16)),
              SizedBox(width: 12),
              SBar(width: 80, height: 16),
            ],
          ),
          SizedBox(height: 8),
          SBar(width: 140, height: 12),
          SizedBox(height: 14),
          Row(
            children: [
              SBar(width: 90, height: 22, borderRadius: 99),
              SizedBox(width: 8),
              SBar(width: 80, height: 11),
              Spacer(),
              SBar(width: 32, height: 11),
            ],
          ),
        ],
      ),
    );
  }
}

/// Taklif kartasi: sarlavha + narx; tur · buyurtma holati; xabar; taklif holati, sana, star.
class _OfferCard extends StatelessWidget {
  const _OfferCard({required this.offer, required this.onTap});
  final OfferModel offer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final o = offer;
    final color = _offerColor(o.status);
    final meta = [
      kOrderTypeLabel[o.order.type] ?? o.order.type,
      o.order.deleted
          ? "buyurtma öçirilgan"
          : 'buyurtma: ${(kOrderStatusLabel[o.order.status] ?? o.order.status).toLowerCase()}',
    ].join(' · ');
    return WebCard(
      onTap: onTap,
      opacity: o.order.deleted ? 0.7 : 1,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  o.order.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: WebC.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                "${groupDigits(o.price)} söm",
                style: TextStyle(
                  color: WebC.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  height: 1.4,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            meta,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: WebC.zinc400, fontSize: 13),
          ),
          if ((o.message ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              o.message!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: WebC.zinc300, fontSize: 13, height: 1.4),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                height: 24,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  kOfferStatusLabel[o.status] ?? o.status,
                  maxLines: 1,
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  shortDateTime(o.createdAt),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
              ),
              Text(
                '${o.starsSpent}',
                style: TextStyle(
                  color: WebC.amber,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 2),
              const StarGlyph(size: 12),
            ],
          ),
        ],
      ),
    );
  }
}
