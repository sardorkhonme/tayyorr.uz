part of 'auth_bloc.dart';

enum AuthStatus {
  unknown,
  authenticating,
  authenticated,
  unauthenticated,
  // Google bilan kirdi, lekin rol/login hali tanlanmagan — profilni
  // tugallash sahifasi ko'rsatiladi.
  onboarding,
  // «Hisobdan çiqilmoqda» animatsiyasi körsatilayotgan payt
  signingOut,
}

class AuthState extends Equatable {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.error,
    this.busyLabel,
  });

  final AuthStatus status;
  final UserModel? user;
  final String? error;

  /// [AuthStatus.authenticating] paytida butun ekranli kutiş sahifasidagi matn
  /// («Kirilmoqda...», «Saqlanmoqda...»).
  final String? busyLabel;

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? error,
    bool clearError = false,
    String? busyLabel,
  }) {
    final next = status ?? this.status;
    return AuthState(
      status: next,
      user: user ?? this.user,
      error: clearError ? null : (error ?? this.error),
      // matn faqat kutiş paytida yaşaydi
      busyLabel: next == AuthStatus.authenticating
          ? (busyLabel ?? this.busyLabel)
          : null,
    );
  }

  @override
  // `user` — butun obyekt: rasm, balans, ism o'zgarganda ham ekran yangilansin.
  List<Object?> get props => [status, user, error, busyLabel];
}
