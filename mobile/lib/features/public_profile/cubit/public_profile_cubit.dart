import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/bloc/safe_emit.dart';
import '../../../core/network/api_exception.dart';
import '../data/public_profile_model.dart';
import '../data/public_profile_repository.dart';

enum PublicProfileStatus { loading, success, failure }

class PublicProfileState extends Equatable {
  const PublicProfileState({this.status = PublicProfileStatus.loading, this.profile, this.error});

  final PublicProfileStatus status;
  final PublicProfileModel? profile;
  final String? error;

  @override
  List<Object?> get props => [status, profile, error];
}

class PublicProfileCubit extends Cubit<PublicProfileState> with SafeEmit<PublicProfileState> {
  PublicProfileCubit(this._repo, this.userId) : super(const PublicProfileState()) {
    load();
  }

  final PublicProfileRepository _repo;
  final String userId;

  Future<void> load() async {
    emit(const PublicProfileState(status: PublicProfileStatus.loading));
    try {
      final profile = await _repo.fetch(userId);
      emit(PublicProfileState(status: PublicProfileStatus.success, profile: profile));
    } on ApiException catch (e) {
      emit(PublicProfileState(status: PublicProfileStatus.failure, error: e.message));
    }
  }
}
