part of 'auth_bloc.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

/// Ilova ochilganda — saqlangan token bormi tekshiradi.
class AuthStarted extends AuthEvent {
  const AuthStarted();
}

class AuthLoginRequested extends AuthEvent {
  const AuthLoginRequested({required this.login, required this.password});
  final String login;
  final String password;
  @override
  List<Object?> get props => [login, password];
}

class AuthGoogleSignInRequested extends AuthEvent {
  const AuthGoogleSignInRequested();
}

class AuthOnboardingCompleted extends AuthEvent {
  const AuthOnboardingCompleted({
    required this.role,
    required this.firstName,
    required this.lastName,
    required this.login,
    required this.password,
    required this.about,
  });
  final String role;
  final String firstName;
  final String lastName;
  final String login;
  final String password;
  final String about;
  @override
  List<Object?> get props =>
      [role, firstName, lastName, login, password, about];
}

class AuthLoggedOut extends AuthEvent {
  const AuthLoggedOut();
}

class AuthMeRefreshRequested extends AuthEvent {
  const AuthMeRefreshRequested();
}

/// Server yangilangan foydalanuvchini qaytarganda (masalan rasm yuklangach)
/// qo'shimcha so'rovsiz darhol holatga yoziladi.
class AuthUserUpdated extends AuthEvent {
  const AuthUserUpdated(this.user);
  final UserModel user;

  @override
  List<Object?> get props => [user];
}
