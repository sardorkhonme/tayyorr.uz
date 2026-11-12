import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/realtime/realtime_service.dart';
import '../data/wallet_model.dart';
import '../data/wallet_repository.dart';

enum WalletStatus { initial, loading, success, failure }

class WalletState extends Equatable {
  const WalletState({
    this.status = WalletStatus.initial,
    this.wallet,
    this.error,
  });

  final WalletStatus status;
  final WalletModel? wallet;
  final String? error;

  WalletState copyWith({
    WalletStatus? status,
    WalletModel? wallet,
    String? error,
  }) {
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
  WalletCubit(this._repo) : super(const WalletState()) {
    // hamyon o'zgarganda (to'lov, daromad, yechish) server signal yuboradi — jimgina yangilaymiz
    _rt = RealtimeService.instance.events.listen((e) {
      if (e.name == 'wallet') _silent();
    });
  }

  final WalletRepository _repo;
  StreamSubscription<RealtimeEvent>? _rt;

  Future<void> _silent() async {
    try {
      final wallet = await _repo.fetchWallet();
      emit(state.copyWith(status: WalletStatus.success, wallet: wallet));
    } catch (_) {
      /* jim */
    }
  }

  @override
  Future<void> close() {
    _rt?.cancel();
    return super.close();
  }

  Future<void> load() async {
    emit(state.copyWith(status: WalletStatus.loading));
    try {
      final wallet = await _repo.fetchWallet();
      emit(state.copyWith(status: WalletStatus.success, wallet: wallet));
    } catch (e) {
      emit(
        state.copyWith(status: WalletStatus.failure, error: friendlyError(e)),
      );
    }
  }
}
