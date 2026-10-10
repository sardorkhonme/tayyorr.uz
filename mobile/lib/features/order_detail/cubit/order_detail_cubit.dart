import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../data/order_detail_model.dart';
import '../data/order_detail_repository.dart';

enum OrderDetailStatus { initial, loading, success, failure }

class OrderDetailState extends Equatable {
  const OrderDetailState({
    this.status = OrderDetailStatus.initial,
    this.order,
    this.error,
    this.busy = false,
  });

  final OrderDetailStatus status;
  final OrderDetailModel? order;
  final String? error;
  final bool busy;

  OrderDetailState copyWith({
    OrderDetailStatus? status,
    OrderDetailModel? order,
    String? error,
    bool? busy,
  }) {
    return OrderDetailState(
      status: status ?? this.status,
      order: order ?? this.order,
      error: error,
      busy: busy ?? this.busy,
    );
  }

  @override
  List<Object?> get props => [status, order, error, busy];
}

class OrderDetailCubit extends Cubit<OrderDetailState> with SafeEmit<OrderDetailState> {
  OrderDetailCubit(this._repo, this.orderId) : super(const OrderDetailState());

  final OrderDetailRepository _repo;
  final String orderId;

  Future<void> load() async {
    emit(state.copyWith(status: OrderDetailStatus.loading));
    try {
      final order = await _repo.fetchOrder(orderId);
      emit(state.copyWith(status: OrderDetailStatus.success, order: order));
    } on ApiException catch (e) {
      emit(state.copyWith(status: OrderDetailStatus.failure, error: e.message));
    }
  }

  Future<bool> submitOffer({required int price, String? message, int? stars}) async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.submitOffer(orderId, price: price, message: message, stars: stars);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> boostOffer(int stars) async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.boostOffer(orderId, stars: stars);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> respondToOffer(String offerId, {required bool accept}) async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.respondToOffer(offerId, accept: accept);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> setStatus(String status) async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.setOrderStatus(orderId, status);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> deleteOrder() async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.deleteOrder(orderId);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> sendContract({required String preparerId, required int amount, String? note, DateTime? deadline}) async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.sendContract(orderId, preparerId: preparerId, amount: amount, note: note, deadline: deadline);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> respondToContract(String contractId, {required String action}) async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.respondToContract(contractId, action: action);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> finalizeOrder() async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.finalizeOrder(orderId);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }

  Future<bool> submitReview({required int stars, String? comment}) async {
    emit(state.copyWith(busy: true, error: null));
    try {
      await _repo.submitReview(orderId, stars: stars, comment: comment);
      await load();
      return true;
    } on ApiException catch (e) {
      emit(state.copyWith(busy: false, error: e.message));
      return false;
    }
  }
}
