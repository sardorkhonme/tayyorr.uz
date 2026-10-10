import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../data/referral_model.dart';
import '../data/referral_repository.dart';

enum ReferralStatus { initial, loading, success, failure }

class ReferralState extends Equatable {
  const ReferralState({this.status = ReferralStatus.initial, this.data, this.error});

  final ReferralStatus status;
  final ReferralModel? data;
  final String? error;

  ReferralState copyWith({ReferralStatus? status, ReferralModel? data, String? error}) {
    return ReferralState(status: status ?? this.status, data: data ?? this.data, error: error);
  }

  @override
  List<Object?> get props => [status, data, error];
}

class ReferralCubit extends Cubit<ReferralState> with SafeEmit<ReferralState> {
  ReferralCubit(this._repo) : super(const ReferralState());

  final ReferralRepository _repo;

  Future<void> load() async {
    emit(state.copyWith(status: ReferralStatus.loading));
    try {
      final data = await _repo.fetchReferral();
      emit(state.copyWith(status: ReferralStatus.success, data: data));
    } on ApiException catch (e) {
      emit(state.copyWith(status: ReferralStatus.failure, error: e.message));
    }
  }
}
