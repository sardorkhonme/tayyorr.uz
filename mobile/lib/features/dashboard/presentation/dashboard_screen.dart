import 'package:tayyorr_app/core/ui/ticons.dart';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/mascot.dart';
import '../../../widgets/web_ui.dart';
import '../../announcements/announcement_banner.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../cubit/dashboard_cubit.dart';
import '../data/order_model.dart';
import '../data/orders_repository.dart';
import 'header_tools.dart';
import 'order_list_widgets.dart';

// Saytdagi OrdersBrowser bilan bir xil saralash va filtrlar.
enum _Sort { newest, oldest, offers, budget }

const _sortLabel = {
  _Sort.newest: 'Eng yangi',
  _Sort.oldest: 'Eng eski',
  _Sort.offers: "Köp taklif",
  _Sort.budget: 'Katta byudjet',
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
  _Bucket('gt50', "50 tadan köp", (n) => n > 50),
];

/// Asosiy: ochiq buyurtmalar lentasi. Tayyorlovchi — taklif yuborish uchun; buyurtmachi —
/// boshqalarning ochiq buyurtmalarini faqat ko'radi (o'zinikilari — «Buyurtmalarim» bo'limida).
/// Headerda: qidiruv (butun ekran natijalari) va filtr (ikonka ostida ochiladigan menyu).
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DashboardCubit(OrdersRepository(), scope: 'feed')..load(),
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
  final _search = TextEditingController();
  bool _searching = false;
  String _q = '';
  final Set<String> _types = {};
  final Set<String> _bucketKeys = {};
  final Set<String> _statuses = {};
  _Sort _sort = _Sort.newest;
  List<Announcement> _announcements = const [];

  /// Header ikonkalar guruhining konteksti — filtr menyusi uning ostida ochiladi.
  BuildContext? _anchor;

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
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
    await Future.wait([
      context.read<DashboardCubit>().load(),
      _loadAnnouncements(),
    ]);
  }

  int get _filterCount => _types.length + _bucketKeys.length + _statuses.length;
  bool get _filterActive => _filterCount > 0 || _sort != _Sort.newest;

  void _clearFilters() {
    _types.clear();
    _bucketKeys.clear();
    _statuses.clear();
    _sort = _Sort.newest;
  }

  List<OrderModel> _filtered(List<OrderModel> orders) {
    final needle = _searching ? _q.trim().toLowerCase() : '';
    final list = orders.where((o) {
      if (_types.isNotEmpty && !_types.contains(o.type)) return false;
      if (_statuses.isNotEmpty && !_statuses.contains(o.status)) return false;
      if (_bucketKeys.isNotEmpty &&
          !_buckets.any(
            (b) => _bucketKeys.contains(b.key) && b.test(o.offers),
          )) {
        return false;
      }
      if (needle.isNotEmpty) {
        final hay =
            '${o.title} ${o.description} ${kOrderTypeLabel[o.type] ?? o.type}'
                .toLowerCase();
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

  Future<void> _openOrder(OrderModel o) async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id)));
    if (mounted) context.read<DashboardCubit>().load();
  }

  void _openSearch() => setState(() => _searching = true);

  void _closeSearch() {
    FocusScope.of(context).unfocus();
    setState(() {
      _searching = false;
      _q = '';
      _search.clear();
    });
  }

  void _openFilter() {
    final anchor = _anchor;
    if (anchor == null || !anchor.mounted) return;
    final orders = context.read<DashboardCubit>().state.orders;
    // holat filtri — lentada bir nechta holat bo'lsagina (tayyorlovchida o'zi bajarayotganlari ham bor)
    final statuses = {for (final o in orders) o.status};
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
          title: 'Filtr va saralaş',
          resultLabel: 'Körsatiş (${_filtered(orders).length})',
          onReset: _filterActive ? () => update(_clearFilters) : null,
          sections: [
            DropdownSection(
              title: 'Saralaş',
              chips: [
                for (final s in _Sort.values)
                  DropdownChip(
                    label: _sortLabel[s]!,
                    active: _sort == s,
                    onTap: () => update(() => _sort = s),
                  ),
              ],
            ),
            if (statuses.length > 1)
              DropdownSection(
                title: 'Holat',
                chips: [
                  for (final e in kOrderStatusLabel.entries)
                    if (statuses.contains(e.key))
                      toggle(_statuses, e.key, e.value),
                ],
              ),
            DropdownSection(
              title: 'Işning turi',
              chips: [
                for (final e in kOrderTypeLabel.entries)
                  toggle(_types, e.key, e.value),
              ],
            ),
            DropdownSection(
              title: 'Takliflar soni',
              chips: [
                for (final b in _buckets) toggle(_bucketKeys, b.key, b.label),
              ],
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isPreparer = context.select<AuthBloc, bool>(
      (b) => b.state.user?.isPreparer ?? false,
    );
    final bottom = MediaQuery.paddingOf(context).bottom;

    return PopScope(
      // qidiruv ochiq bo'lsa — «orqaga» avval qidiruvni yopadi
      canPop: !_searching,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _searching) _closeSearch();
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: BlocBuilder<DashboardCubit, DashboardState>(
          builder: (context, state) {
            final loading =
                (state.status == DashboardStatus.loading ||
                    state.status == DashboardStatus.initial) &&
                state.orders.isEmpty;
            final filtered = _filtered(state.orders);
            final showBanner = !_searching && _announcements.isNotEmpty;
            final chips = <(String, VoidCallback)>[
              if (_sort != _Sort.newest)
                (
                  _sortLabel[_sort]!,
                  () => setState(() => _sort = _Sort.newest),
                ),
              for (final s in _statuses)
                (
                  kOrderStatusLabel[s] ?? s,
                  () => setState(() => _statuses.remove(s)),
                ),
              for (final t in _types)
                (
                  kOrderTypeLabel[t] ?? t,
                  () => setState(() => _types.remove(t)),
                ),
              for (final b in _bucketKeys)
                (
                  'Takliflar: ${_buckets.firstWhere((x) => x.key == b).label}',
                  () => setState(() => _bucketKeys.remove(b)),
                ),
            ];

            final String title;
            if (_searching) {
              title = _q.trim().isEmpty ? 'Qidiriş' : 'Qidiruv natijalari';
            } else {
              title = isPreparer ? 'Buyurtmalar' : 'Oçiq buyurtmalar';
            }

            return RefreshIndicator(
              onRefresh: _refresh,
              color: AppColors.indigo,
              edgeOffset: 80,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  AppHeaderSliver(
                    trailing: Builder(
                      builder: (ctx) {
                        _anchor = ctx;
                        return HeaderIconGroup(
                          items: [
                            HeaderIconItem(
                              icon: TI.search_rounded,
                              label: 'Qidiriş',
                              onTap: _openSearch,
                            ),
                            HeaderIconItem(
                              icon: TI.tune_rounded,
                              label: 'Filtr',
                              onTap: _openFilter,
                              active: _filterActive,
                              badge: _filterActive,
                            ),
                          ],
                        );
                      },
                    ),
                    replace: _searching
                        ? HeaderSearchField(
                            controller: _search,
                            hint: 'Sarlavha, tavsif yoki tur…',
                            onChanged: (v) => setState(() => _q = v),
                            onClose: _closeSearch,
                          )
                        : null,
                  ),
                  if (showBanner)
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 0),
                      sliver: SliverToBoxAdapter(
                        child: AnnouncementCarousel(items: _announcements),
                      ),
                    ),
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      12,
                      showBanner ? 24 : 16,
                      12,
                      0,
                    ),
                    sliver: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ListHeading(
                            title: title,
                            count: loading ? null : '${filtered.length} ta',
                          ),
                          if (!isPreparer && !_searching) ...[
                            const SizedBox(height: 4),
                            Text(
                              "Boşqa foydalanuvçilarning buyurtmalari — faqat köriş uçun. "
                              "Özingizniki «Buyurtmalarim» bölimida.",
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
                              onClearAll: () => setState(_clearFilters),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(12, 12, 12, 32 + bottom),
                    sliver: loading
                        ? SliverList.separated(
                            itemCount: 4,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 12),
                            itemBuilder: (_, _) =>
                                const OrderListTileSkeleton(),
                          )
                        : filtered.isEmpty
                        ? SliverToBoxAdapter(
                            child: state.status == DashboardStatus.failure
                                ? ErrorState.from(
                                    state.error,
                                    () => context.read<DashboardCubit>().load(),
                                    card: true,
                                  )
                                : state.orders.isEmpty
                                ? const ListMessage(
                                    pose: MascotPose.emptyFeed,
                                    title: "Hozirça oçiq buyurtma yöq",
                                    subtitle:
                                        "Yangi buyurtmalar şu yerda paydo böladi.",
                                  )
                                : ListMessage(
                                    pose: MascotPose.noResults,
                                    title: 'Mos buyurtma topilmadi',
                                    subtitle: _filterActive
                                        ? "Filtrni özgartirib köring."
                                        : "Boşqa söz bilan qidirib köring.",
                                  ),
                          )
                        : SliverList.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 12),
                            itemBuilder: (_, i) => OrderListTile(
                              order: filtered[i],
                              onTap: () => _openOrder(filtered[i]),
                            ),
                          ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
