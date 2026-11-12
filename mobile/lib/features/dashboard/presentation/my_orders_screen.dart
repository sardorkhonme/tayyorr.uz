import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/web_ui.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../cubit/dashboard_cubit.dart';
import '../data/order_model.dart';
import '../data/orders_repository.dart';
import 'create_order_screen.dart';
import 'header_tools.dart';
import 'order_list_widgets.dart';

/// Buyurtmachining «Buyurtmalarim» bo'limi: o'z buyurtmalari ro'yxati.
/// Headerda: «+» (yangi buyurtma) va qidiruv.
class MyOrdersScreen extends StatelessWidget {
  const MyOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DashboardCubit(OrdersRepository(), scope: 'mine')..load(),
      child: const _MyOrdersView(),
    );
  }
}

class _MyOrdersView extends StatefulWidget {
  const _MyOrdersView();

  @override
  State<_MyOrdersView> createState() => _MyOrdersViewState();
}

class _MyOrdersViewState extends State<_MyOrdersView> {
  final _search = TextEditingController();
  bool _searching = false;
  String _q = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<OrderModel> _filtered(List<OrderModel> orders) {
    final needle = _searching ? _q.trim().toLowerCase() : '';
    final list = needle.isEmpty
        ? [...orders]
        : orders
              .where(
                (o) =>
                    '${o.title} ${o.description} ${kOrderTypeLabel[o.type] ?? o.type}'
                        .toLowerCase()
                        .contains(needle),
              )
              .toList();
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  Future<void> _newOrder() async {
    // yaratilgach buyurtma sahifasiga o'tiladi — qaytganda ro'yxat yangilanadi
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const CreateOrderScreen()));
    if (mounted) context.read<DashboardCubit>().load();
  }

  Future<void> _openOrder(OrderModel o) async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id)));
    if (mounted) context.read<DashboardCubit>().load();
  }

  void _closeSearch() {
    FocusScope.of(context).unfocus();
    setState(() {
      _searching = false;
      _q = '';
      _search.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return PopScope(
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
            final list = _filtered(state.orders);
            final empty =
                !loading &&
                state.status != DashboardStatus.failure &&
                state.orders.isEmpty;
            return RefreshIndicator(
              onRefresh: () => context.read<DashboardCubit>().load(),
              color: AppColors.indigo,
              edgeOffset: 80,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  AppHeaderSliver(
                    trailing: HeaderIconGroup(
                      items: [
                        HeaderIconItem(
                          icon: TI.add_rounded,
                          label: 'Yangi buyurtma',
                          onTap: _newOrder,
                        ),
                        HeaderIconItem(
                          icon: TI.search_rounded,
                          label: 'Qidiriş',
                          onTap: () => setState(() => _searching = true),
                        ),
                      ],
                    ),
                    replace: _searching
                        ? HeaderSearchField(
                            controller: _search,
                            hint: 'Buyurtmalarimdan qidiriş…',
                            onChanged: (v) => setState(() => _q = v),
                            onClose: _closeSearch,
                          )
                        : null,
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(12, 16, 12, 0),
                    sliver: SliverToBoxAdapter(
                      child: ListHeading(
                        title: _searching
                            ? (_q.trim().isEmpty
                                  ? 'Qidiriş'
                                  : 'Qidiruv natijalari')
                            : 'Buyurtmalarim',
                        count: loading || empty ? null : '${list.length} ta',
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
                        : empty
                        ? SliverToBoxAdapter(
                            child: _EmptyOrders(onCreate: _newOrder),
                          )
                        : list.isEmpty
                        ? SliverToBoxAdapter(
                            child: state.status == DashboardStatus.failure
                                ? ListMessage(
                                    icon: TI.wifi_off_rounded,
                                    title: "Yuklab bölmadi",
                                    subtitle:
                                        state.error ??
                                        'Pastga tortib qayta uriniş mumkin.',
                                  )
                                : const ListMessage(
                                    icon: TI.search_off_rounded,
                                    title: 'Heç narsa topilmadi',
                                    subtitle: "Boşqa söz bilan qidirib köring.",
                                  ),
                          )
                        : SliverList.separated(
                            itemCount: list.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 12),
                            itemBuilder: (_, i) => OrderListTile(
                              order: list[i],
                              onTap: () => _openOrder(list[i]),
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

/// Hali buyurtma yo'q: rasm (widgetlarda chizilgan), qisqa matn va «Buyurtma yaratiş» tugmasi.
class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders({required this.onCreate});
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return WebCard(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
      child: Column(
        children: [
          const _PaperStack(),
          const SizedBox(height: 24),
          Text(
            "Hali buyurtma yöq",
            textAlign: TextAlign.center,
            style: TextStyle(
              color: WebC.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Prezentatsiya, referat, kurs işi yoki diplom — vazifani yozing, "
            "tayyorlovçilar narx taklif qiladi, siz eng maqbulini tanlaysiz.",
            textAlign: TextAlign.center,
            style: TextStyle(color: WebC.zinc400, fontSize: 14, height: 1.45),
          ),
          const SizedBox(height: 24),
          WebButton(
            label: 'Buyurtma yaratiş',
            leading: TI.add_rounded,
            expand: true,
            onPressed: onCreate,
          ),
        ],
      ),
    );
  }
}

/// Ikki varaq qog'oz ustma-ust + indigo «+» nişoni.
class _PaperStack extends StatelessWidget {
  const _PaperStack();

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final paper = light ? Colors.white : const Color(0xFF1A1A24);
    final edge = light
        ? Colors.black.withValues(alpha: 0.10)
        : Colors.white.withValues(alpha: 0.12);
    final line = light
        ? Colors.black.withValues(alpha: 0.10)
        : Colors.white.withValues(alpha: 0.14);

    Widget sheet({
      required double angle,
      required Offset offset,
      bool front = false,
    }) {
      return Transform.translate(
        offset: offset,
        child: Transform.rotate(
          angle: angle,
          child: Container(
            width: 84,
            height: 104,
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
            decoration: BoxDecoration(
              color: paper,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: edge),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: light ? 0.08 : 0.35),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: front
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 34,
                        height: 7,
                        decoration: BoxDecoration(
                          color: const Color(0xFF818CF8).withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 10),
                      for (final w in [56.0, 48.0, 54.0, 32.0]) ...[
                        Container(
                          width: w,
                          height: 5,
                          decoration: BoxDecoration(
                            color: line,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(height: 7),
                      ],
                    ],
                  )
                : null,
          ),
        ),
      );
    }

    return SizedBox(
      width: 150,
      height: 124,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          // yumshoq doira fon
          Container(
            width: 124,
            height: 124,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(
                0xFF6366F1,
              ).withValues(alpha: light ? 0.08 : 0.12),
            ),
          ),
          sheet(angle: -0.16, offset: const Offset(-14, 4)),
          sheet(angle: 0.06, offset: const Offset(8, -2), front: true),
          Positioned(
            right: 8,
            bottom: 0,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF6366F1),
                border: Border.all(color: paper, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF4F46E5).withValues(alpha: 0.45),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const TIcon(TI.add_rounded, size: 20, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
