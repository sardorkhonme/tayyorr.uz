import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../data/offer_model.dart';
import '../data/offers_repository.dart';

enum OffersStatus { initial, loading, success, failure }

class OffersState extends Equatable {
  const OffersState({
    this.status = OffersStatus.initial,
    this.offers = const [],
    this.error,
  });

  final OffersStatus status;
  final List<OfferModel> offers;
  final String? error;

  OffersState copyWith({
    OffersStatus? status,
    List<OfferModel>? offers,
    String? error,
  }) {
    return OffersState(
      status: status ?? this.status,
      offers: offers ?? this.offers,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, offers, error];
}

class OffersCubit extends Cubit<OffersState> with SafeEmit<OffersState> {
  OffersCubit(this._repo) : super(const OffersState());

  final OffersRepository _repo;

  Future<void> load() async {
    emit(state.copyWith(status: OffersStatus.loading));
    try {
      final offers = await _repo.fetchMyOffers();
      emit(state.copyWith(status: OffersStatus.success, offers: offers));
    } on ApiException catch (e) {
      emit(state.copyWith(status: OffersStatus.failure, error: e.message));
    }
  }
}
