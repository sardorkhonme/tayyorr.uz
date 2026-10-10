import 'package:flutter_bloc/flutter_bloc.dart';

enum AppSection { dashboard, offers, referral, messages, wallet, profile }

/// Joriy bo'lim. Global — header menyusi ichki (push qilingan) sahifalarda
/// ham ishlashi uchun: u yerdan bo'lim tanlansa, bosh qobiqqa qaytiladi.
class SectionCubit extends Cubit<AppSection> {
  SectionCubit._() : super(AppSection.dashboard);
  static final instance = SectionCubit._();

  void select(AppSection section) => emit(section);
}
