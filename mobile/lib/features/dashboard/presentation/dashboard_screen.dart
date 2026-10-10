import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_ui.dart';
import '../../announcements/announcement_banner.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../cubit/dashboard_cubit.dart';
import '../data/order_model.dart';
import '../data/orders_repository.dart';
import 'create_order_screen.dart';

// Saytdagi OrdersBrowser bilan bir xil saralash va filtrlar.
enum _Sort { newest, oldest, offers, budget }

const _sortLabel = {
  _Sort.newest: 'Yangi',
  _Sort.oldest: 'Eski',
  _Sort.offers: 'Takliflar',
  _Sort.budget: 'Byudjet',
};

class _Bucket {
  const _Bucket(this.key, this.label, this.test);
  final String key;
  final String label;
  final bool Function(int) test;
}

final _buckets = [
  _Bucket('lt5', '5 tadan kam', (n) => n < 5),
  _Bucket('5-10', '5 – 10 ta', (n) => n >= 5 && n <= 10),
  _Bucket('10-50', '10 – 50 ta', (n) => n > 10 && n <= 50),
  _Bucket('gt50', "50 tadan ko'p", (n) => n > 50),
];

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DashboardCubit(OrdersRepository())..load(),
      child: const _DashboardView(),
    );
  }
}

class _DashboardView extends StatefulWidget {
  const _DashboardView();

  @override
  State<_DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<_DashboardView> {
  String _q = '';
  final Set<String> _types = {};
  final Set<String> _bucketKeys = {};
  _Sort _sort = _Sort.newest;
  List<Announcement> _announcements = const [];

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  Future<void> _loadAnnouncements() async {
    try {
      final list = await Announcement.fetch();
      if (mounted) setState(() => _announcements = list);
    } catch (_) {
      /* banner majburiy emas */
    }
  }

  Future<void> _refresh() async {
    await Future.wait([context.read<DashboardCubit>().load(), _loadAnnouncements()]);
  }

  int get _activeCount => _types.length + _bucketKeys.length;

  List<OrderModel> _filtered(List<OrderModel> orders) {
    final needle = _q.trim().toLowerCase();
    final list = orders.where((o) {
      if (_types.isNotEmpty && !_types.contains(o.type)) return false;
      if (_bucketKeys.isNotEmpty &&
          !_buckets.any((b) => _bucketKeys.contains(b.key) && b.test(o.offers))) {
        return false;
      }
      if (needle.isNotEmpty) {
        final hay = '${o.title} ${o.description} ${kOrderTypeLabel[o.type] ?? o.type}'.toLowerCase();
        if (!hay.contains(needle)) return false;
      }
      return true;
    }).toList();
    switch (_sort) {
      case _Sort.newest:
        list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      case _Sort.oldest:
        list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      case _Sort.offers:
        list.sort((a, b) => b.offers.compareTo(a.offers));
      case _Sort.budget:
        list.sort((a, b) => (b.budget ?? 0).compareTo(a.budget ?? 0));
    }
    return list;
  }

  Future<void> _newOrder() async {
    // yaratilgach buyurtma sahifasiga o'tiladi — qaytganda ro'yxat yangilanadi
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CreateOrderScreen()),
    );
    if (mounted) context.read<DashboardCubit>().load();
  }

  Future<void> _openOrder(OrderModel o) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id)),
    );
    if (mounted) context.read<DashboardCubit>().load();
  }

  void _openFilter(List<OrderModel> orders) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheet) {
          void update(VoidCallback fn) {
            setState(fn);
            setSheet(() {});
          }

          final count = _filtered(orders).length;
          Widget section(String title, List<Widget> chips) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title.toUpperCase(),
                      style: TextStyle(color: WebC.zinc500, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.6)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: chips),
                ],
              );
          return Container(
            decoration: BoxDecoration(
              color: AppColors.isLight ? Colors.white : const Color(0xFF14141B),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              border: Border.all(color: WebC.border),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(border: Border(bottom: BorderSide(color: WebC.border))),
                    child: Row(
                      children: [
                        Text('Filtr', style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w600)),
                        const Spacer(),
                        GestureDetector(
                          onTap: () => Navigator.of(sheetContext).pop(),
                          child: Text('✕', style: TextStyle(color: WebC.zinc500, fontSize: 16)),
                        ),
                      ],
                    ),
                  ),
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          section('Ishning turi', [
                            for (final e in kOrderTypeLabel.entries)
                              WebPill(
                                bordered: true,
                                label: e.value,
                                active: _types.contains(e.key),
                                onTap: () => update(() => _types.contains(e.key) ? _types.remove(e.key) : _types.add(e.key)),
                              ),
                          ]),
                          const SizedBox(height: 20),
                          section('Topshirganlar soni', [
                            for (final b in _buckets)
                              WebPill(
                                bordered: true,
                                label: b.label,
                                active: _bucketKeys.contains(b.key),
                                onTap: () => update(
                                    () => _bucketKeys.contains(b.key) ? _bucketKeys.remove(b.key) : _bucketKeys.add(b.key)),
                              ),
                          ]),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(border: Border(top: BorderSide(color: WebC.border))),
                    child: Row(
                      children: [
                        GestureDetector(
                          onTap: () => update(() {
                            _types.clear();
                            _bucketKeys.clear();
                          }),
                          child: Text('Hammasini tozalash', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
                        ),
                        const Spacer(),
                        WebButton(label: "Ko'rsatish ($count)", onPressed: () => Navigator.of(sheetContext).pop()),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;
    final mine = !(user?.isPreparer ?? false);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: BlocBuilder<DashboardCubit, DashboardState>(
        builder: (context, state) {
          final loading = state.status == DashboardStatus.loading && state.orders.isEmpty;
          final filtered = _filtered(state.orders);
          return RefreshIndicator(
            onRefresh: _refresh,
            color: AppColors.indigo,
            edgeOffset: 80,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                const AppHeaderSliver(),
                if (_announcements.isNotEmpty)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(12, 20, 12, 0),
                    sliver: SliverToBoxAdapter(child: AnnouncementCarousel(items: _announcements)),
                  ),
                SliverPadding(
                  padding: EdgeInsets.only(top: _announcements.isNotEmpty ? 12 : 20),
                  sliver: SliverPersistentHeader(
                    pinned: true,
                    delegate: _ControlsDelegate(
                      mine: mine,
                      count: filtered.length,
                      sort: _sort,
                      activeCount: _activeCount,
                      onSearch: (v) => setState(() => _q = v),
                      onSort: (s) => setState(() => _sort = s),
                      onFilter: () => _openFilter(state.orders),
                      onNew: mine ? _newOrder : null,
                    ),
                  ),
                ),
                if (_activeCount > 0)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                    sliver: SliverToBoxAdapter(child: _activeChips()),
                  ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 32),
                  sliver: loading
                      ? SliverList.separated(
                          itemCount: 4,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (_, __) => const SBlock(height: 92),
                        )
                      : filtered.isEmpty
                          ? SliverToBoxAdapter(
                              child: WebCard(
                                child: Text(
                                  state.status == DashboardStatus.failure
                                      ? (state.error ?? 'Yuklab bo\'lmadi')
                                      : state.orders.isEmpty
                                          ? "Hali buyurtma yo'q."
                                          : 'Mos buyurtma topilmadi.',
                                  style: TextStyle(color: WebC.zinc500, fontSize: 14),
                                ),
                              ),
                            )
                          : SliverList.separated(
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (_, i) => _OrderRow(order: filtered[i], onTap: () => _openOrder(filtered[i])),
                            ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _activeChips() {
    Widget chip(String label, VoidCallback onRemove) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: WebC.fill10, borderRadius: BorderRadius.circular(999)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(label, style: TextStyle(color: WebC.zinc300, fontSize: 12)),
              const SizedBox(width: 4),
              GestureDetector(onTap: onRemove, child: Text('✕', style: TextStyle(color: WebC.zinc500, fontSize: 12))),
            ],
          ),
        );
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final t in _types) chip(kOrderTypeLabel[t] ?? t, () => setState(() => _types.remove(t))),
        for (final b in _bucketKeys)
          chip(_buckets.firstWhere((x) => x.key == b).label, () => setState(() => _bucketKeys.remove(b))),
        GestureDetector(
          onTap: () => setState(() {
            _types.clear();
            _bucketKeys.clear();
          }),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Text('Tozalash', style: TextStyle(color: WebC.zinc500, fontSize: 12)),
          ),
        ),
      ],
    );
  }
}

/// Saytdagi yopishqoq boshqaruv paneli (sarlavha, qidiruv, filtr, saralash).
class _ControlsDelegate extends SliverPersistentHeaderDelegate {
  _ControlsDelegate({
    required this.mine,
    required this.count,
    required this.sort,
    required this.activeCount,
    required this.onSearch,
    required this.onSort,
    required this.onFilter,
    required this.onNew,
  });

  final bool mine;
  final int count;
  final _Sort sort;
  final int activeCount;
  final ValueChanged<String> onSearch;
  final ValueChanged<_Sort> onSort;
  final VoidCallback onFilter;
  final VoidCallback? onNew;

  static const double _extent = 12 + 38 + 8 + 42 + 8 + 24 + 12 + 2;

  @override
  double get minExtent => _extent;
  @override
  double get maxExtent => _extent;

  @override
  bool shouldRebuild(covariant _ControlsDelegate old) =>
      old.count != count || old.sort != sort || old.activeCount != activeCount || old.mine != mine;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.isLight ? Colors.white.withValues(alpha: 0.88) : const Color(0xFF0B0B12).withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: WebC.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: 38,
                  child: Row(
                    children: [
                      Text(mine ? 'Buyurtmalarim' : 'Buyurtmalar',
                          style: TextStyle(color: WebC.white, fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: -0.3)),
                      const Spacer(),
                      if (onNew != null) WebButton(label: '+ Yangi buyurtma', onPressed: onNew),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 42,
                  child: Row(
                    children: [
                      Expanded(child: WebInput(hint: "Sarlavha, tavsif yoki tur bo'yicha qidirish…", onChanged: onSearch)),
                      const SizedBox(width: 8),
                      WebButton(
                        label: activeCount > 0 ? 'Filtr · $activeCount' : 'Filtr',
                        variant: WebBtn.ghost,
                        onPressed: onFilter,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 24,
                  child: Row(
                    children: [
                      for (final s in _Sort.values) ...[
                        WebPill(label: _sortLabel[s]!, active: sort == s, onTap: () => onSort(s)),
                        const SizedBox(width: 6),
                      ],
                      const Spacer(),
                      Text('$count ta', style: TextStyle(color: WebC.zinc600, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Saytdagi buyurtma qatori (`.card` ichida chapda matn, o'ngda "N taklif").
class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order, required this.onTap});
  final OrderModel order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final o = order;
    final meta = [
      kOrderTypeLabel[o.type] ?? o.type,
      o.deleted ? "o'chirilgan" : (kOrderStatusLabel[o.status] ?? o.status),
      if (o.ordererLabel != null) '@${o.ordererLabel}',
      if ((o.budget ?? 0) > 0) "${groupDigits(o.budget!)} so'm",
    ].join(' · ');
    return WebCard(
      onTap: onTap,
      opacity: o.deleted ? 0.6 : 1,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (o.deleted) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text("O'CHIRILGAN",
                            style: TextStyle(color: WebC.redSoft, fontSize: 10, fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Expanded(
                      child: Text(o.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w500)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(meta, style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                const SizedBox(height: 4),
                if (o.deleted && (o.deleteReason ?? '').isNotEmpty)
                  Text('Sabab: ${o.deleteReason}',
                      style: TextStyle(color: WebC.redSoft.withValues(alpha: 0.8), fontSize: 11))
                else
                  Text('${timeAgo(o.createdAt)} · ${o.offers} taklif',
                      style: TextStyle(color: WebC.zinc600, fontSize: 11)),
              ],
            ),
          ),
          if (!o.deleted) ...[
            const SizedBox(width: 16),
            WebBadge('${o.offers} taklif'),
          ],
        ],
      ),
    );
  }
}
