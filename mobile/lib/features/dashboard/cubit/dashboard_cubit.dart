import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../data/order_model.dart';
import '../data/orders_repository.dart';

enum DashboardStatus { initial, loading, success, failure }

class DashboardState extends Equatable {
  const DashboardState({
    this.status = DashboardStatus.initial,
    this.orders = const [],
    this.error,
  });

  final DashboardStatus status;
  final List<OrderModel> orders;
  final String? error;

  DashboardState copyWith({
    DashboardStatus? status,
    List<OrderModel>? orders,
    String? error,
  }) {
    return DashboardState(
      status: status ?? this.status,
      orders: orders ?? this.orders,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, orders, error];
}

class DashboardCubit extends Cubit<DashboardState> with SafeEmit<DashboardState> {
  DashboardCubit(this._repo) : super(const DashboardState());

  final OrdersRepository _repo;

  Future<void> load() async {
    emit(state.copyWith(status: DashboardStatus.loading));
    try {
      final orders = await _repo.fetchOrders();
      emit(state.copyWith(status: DashboardStatus.success, orders: orders));
    } on ApiException catch (e) {
      emit(state.copyWith(status: DashboardStatus.failure, error: e.message));
    }
  }
}
