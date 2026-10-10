part of 'auth_bloc.dart';

enum AuthStatus {
  unknown,
  authenticating,
  authenticated,
  unauthenticated,
  // Google bilan kirdi, lekin rol/login hali tanlanmagan — profilni
  // tugallash sahifasi ko'rsatiladi.
  onboarding,
}

class AuthState extends Equatable {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.error,
  });

  final AuthStatus status;
  final UserModel? user;
  final String? error;

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  // `user` — butun obyekt: rasm, balans, ism o'zgarganda ham ekran yangilansin.
  List<Object?> get props => [status, user, error];
}
