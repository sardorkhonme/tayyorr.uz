import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/mascot.dart';
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
                                ? ErrorState.from(
                                    state.error,
                                    () => context.read<DashboardCubit>().load(),
                                    card: true,
                                  )
                                : const ListMessage(
                                    pose: MascotPose.noResults,
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

/// Hali buyurtma yöq: Tayyor-Man (böş quti), qisqa matn va «Buyurtma yaratiş» tugmasi.
class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders({required this.onCreate});
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return MascotState(
      pose: MascotPose.emptyOrders,
      title: "Hali buyurtma yöq",
      message:
          "Prezentatsiya, referat, kurs işi yoki diplom — vazifani yozing, "
          "tayyorlovçilar narx taklif qiladi, siz eng maqbulini tanlaysiz.",
      actionLabel: 'Buyurtma yaratiş',
      actionIcon: TI.add_rounded,
      onAction: onCreate,
      size: 180,
      card: true,
    );
  }
}
