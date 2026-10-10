import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../data/wallet_model.dart';
import '../data/wallet_repository.dart';

enum WalletStatus { initial, loading, success, failure }

class WalletState extends Equatable {
  const WalletState({this.status = WalletStatus.initial, this.wallet, this.error});

  final WalletStatus status;
  final WalletModel? wallet;
  final String? error;

  WalletState copyWith({WalletStatus? status, WalletModel? wallet, String? error}) {
    return WalletState(
      status: status ?? this.status,
      wallet: wallet ?? this.wallet,
      error: error,
    );
  }

  @override
  List<Object?> get props => [status, wallet, error];
}

class WalletCubit extends Cubit<WalletState> with SafeEmit<WalletState> {
  WalletCubit(this._repo) : super(const WalletState());

  final WalletRepository _repo;

  Future<void> load() async {
    emit(state.copyWith(status: WalletStatus.loading));
    try {
      final wallet = await _repo.fetchWallet();
      emit(state.copyWith(status: WalletStatus.success, wallet: wallet));
    } on ApiException catch (e) {
      emit(state.copyWith(status: WalletStatus.failure, error: e.message));
    }
  }
}
