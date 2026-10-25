import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/notifications/push_service.dart';
import '../../../core/theme/theme_controller.dart';
import '../data/auth_repository.dart';
import '../data/user_model.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._repo) : super(const AuthState()) {
    on<AuthStarted>(_onStarted);
    on<AuthLoginRequested>(_onLogin);
    on<AuthGoogleSignInRequested>(_onGoogleSignIn);
    on<AuthOnboardingCompleted>(_onOnboardingCompleted);
    on<AuthLoggedOut>(_onLoggedOut);
    on<AuthMeRefreshRequested>(_onRefresh);
    on<AuthUserUpdated>((event, emit) => emit(state.copyWith(user: event.user)));
  }

  final AuthRepository _repo;

  AuthStatus _statusFor(UserModel user) =>
      user.needsOnboarding ? AuthStatus.onboarding : AuthStatus.authenticated;

  /// Har safar serverdan foydalanuvchi kelganda — yorug'/qorong'i rejimni
  /// shu hisobda saqlangan qiymat bilan sinxronlaydi.
  void _syncTheme(UserModel user) => ThemeController.instance.syncFromServer(user.theme);

  Future<void> _onStarted(AuthStarted event, Emitter<AuthState> emit) async {
    final token = await _repo.readToken();
    if (state.status != AuthStatus.unknown) return;
    if (token == null) {
      emit(state.copyWith(status: AuthStatus.unauthenticated));
      return;
    }

    // Oxirgi ma'lum profil bilan darhol ochamiz, serverdan fonda yangilaymiz —
    // sekin yoki yo'q internetda ham ilova logoda qotib qolmaydi.
    final cached = _repo.cachedUser();
    if (cached != null) {
      _syncTheme(cached);
      emit(state.copyWith(status: _statusFor(cached), user: cached));
      add(const AuthMeRefreshRequested());
      return;
    }

    try {
      final user = await _repo.refreshMe().timeout(const Duration(seconds: 12));
      if (state.status != AuthStatus.unknown) return;
      _syncTheme(user);
      emit(state.copyWith(status: _statusFor(user), user: user));
    } on ApiException catch (e) {
      // faqat token yaroqsiz bo'lsa tizimdan chiqaramiz
      if (e.statusCode == 401) await _repo.logout();
      emit(state.copyWith(status: AuthStatus.unauthenticated));
    } catch (_) {
      emit(state.copyWith(status: AuthStatus.unauthenticated));
    }
  }

  Future<void> _onLogin(
      AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.authenticating, clearError: true));
    try {
      final user =
          await _repo.login(login: event.login, password: event.password);
      _syncTheme(user);
      emit(state.copyWith(status: _statusFor(user), user: user));
    } on ApiException catch (e) {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        error: e.message,
      ));
    }
  }

  Future<void> _onGoogleSignIn(
      AuthGoogleSignInRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.authenticating, clearError: true));
    try {
      final user = await _repo.signInWithGoogle();
      if (user == null) {
        // Foydalanuvchi hisob tanlashni bekor qildi — xatosiz avvalgi holatga.
        emit(state.copyWith(status: AuthStatus.unauthenticated));
        return;
      }
      _syncTheme(user);
      emit(state.copyWith(status: _statusFor(user), user: user));
    } on ApiException catch (e) {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        error: e.message,
      ));
    }
  }

  Future<void> _onOnboardingCompleted(
      AuthOnboardingCompleted event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.authenticating, clearError: true));
    try {
      final user = await _repo.completeOnboarding(
        role: event.role,
        firstName: event.firstName,
        lastName: event.lastName,
        login: event.login,
        password: event.password,
        about: event.about,
        birthDate: event.birthDate,
        hearAboutUs: event.hearAboutUs,
      );
      _syncTheme(user);
      emit(state.copyWith(status: AuthStatus.authenticated, user: user));
    } on ApiException catch (e) {
      emit(state.copyWith(
        status: AuthStatus.onboarding,
        error: e.message,
      ));
    }
  }

  Future<void> _onLoggedOut(
      AuthLoggedOut event, Emitter<AuthState> emit) async {
    await PushService.instance.unregister();
    await _repo.logout();
    emit(const AuthState(status: AuthStatus.unauthenticated));
  }

  Future<void> _onRefresh(
      AuthMeRefreshRequested event, Emitter<AuthState> emit) async {
    try {
      final user = await _repo.refreshMe();
      // shu orada tizimdan chiqilgan bo'lsa — eski javobni qo'llamaymiz
      if (state.status != AuthStatus.authenticated && state.status != AuthStatus.onboarding) return;
      _syncTheme(user);
      emit(state.copyWith(status: _statusFor(user), user: user));
    } on ApiException catch (e) {
      // token yaroqsiz (masalan boshqa qurilmadan chiqilgan) — tizimdan chiqaramiz
      if (e.statusCode == 401) {
        await _repo.logout();
        emit(const AuthState(status: AuthStatus.unauthenticated));
      }
    } catch (_) {
      // jim — vaqtinchalik tarmoq xatosi bo'lishi mumkin, sessiyani uzmaymiz
    }
  }
}
