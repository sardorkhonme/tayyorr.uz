import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../smm/data/smm_api.dart';
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
    on<AuthSignedIn>((event, emit) {
      _syncTheme(event.user);
      emit(
        state.copyWith(
          status: _statusFor(event.user),
          user: event.user,
          clearError: true,
        ),
      );
    });
    on<AuthOnboardingCompleted>(_onOnboardingCompleted);
    on<AuthRoleChosen>(_onRoleChosen);
    on<AuthLoggedOut>(_onLoggedOut);
    on<AuthMeRefreshRequested>(_onRefresh);
    on<AuthUserUpdated>(
      (event, emit) => emit(state.copyWith(user: event.user)),
    );
  }

  final AuthRepository _repo;

  AuthStatus _statusFor(UserModel user) =>
      user.needsOnboarding ? AuthStatus.onboarding : AuthStatus.authenticated;

  /// Har safar serverdan foydalanuvchi kelganda — yorug'/qorong'i rejimni
  /// shu hisobda saqlangan qiymat bilan sinxronlaydi.
  void _syncTheme(UserModel user) =>
      ThemeController.instance.syncFromServer(user.theme);

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

  static const _signingIn = 'Kirilmoqda...';
  static const _saving = 'Saqlanmoqda...';

  /// Heç bir kiriş amali cheksiz kutmaydi.
  static const _limit = Duration(seconds: 40);

  Future<T> _guard<T>(Future<T> f) => f.timeout(
    _limit,
    onTimeout: () =>
        throw ApiException(ApiException.slowMessage, network: true),
  );

  Future<void> _onLogin(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    if (state.status == AuthStatus.authenticating) return;
    emit(
      state.copyWith(
        status: AuthStatus.authenticating,
        clearError: true,
        busyLabel: _signingIn,
      ),
    );
    try {
      final user = await _guard(
        _repo.login(login: event.login, password: event.password),
      );
      _syncTheme(user);
      emit(state.copyWith(status: _statusFor(user), user: user));
    } catch (e) {
      emit(
        state.copyWith(
          status: AuthStatus.unauthenticated,
          error: friendlyError(
            e,
            fallback: 'Kirib bölmadi — qayta urinib köring',
          ),
        ),
      );
    }
  }

  bool _googleBusy = false;

  Future<void> _onGoogleSignIn(
    AuthGoogleSignInRequested event,
    Emitter<AuthState> emit,
  ) async {
    if (_googleBusy || state.status == AuthStatus.authenticating) return;
    _googleBusy = true;
    // eski xato matni yöqolsin (hisob tanlaş oynasi oçilayotganda)
    if (state.error != null) emit(state.copyWith(clearError: true));
    try {
      // 1) hisob tanlaş — bu paytda kiriş sahifasi turaveradi
      final account = await _repo.pickGoogleAccount();
      if (account == null) return; // bekor qilindi — xatosiz
      // 2) hisob tanlandi — butun ekranli «Kirilmoqda...» sahifasi
      emit(
        state.copyWith(
          status: AuthStatus.authenticating,
          clearError: true,
          busyLabel: _signingIn,
        ),
      );
      final user = await _guard(_repo.finishGoogleSignIn(account));
      _syncTheme(user);
      emit(state.copyWith(status: _statusFor(user), user: user));
    } catch (e) {
      emit(
        state.copyWith(
          status: AuthStatus.unauthenticated,
          error: friendlyError(
            e,
            fallback: 'Google orqali kirib bölmadi — qayta urinib köring',
          ),
        ),
      );
    } finally {
      _googleBusy = false;
    }
  }

  Future<void> _onRoleChosen(
    AuthRoleChosen event,
    Emitter<AuthState> emit,
  ) async {
    if (state.status == AuthStatus.authenticating) return;
    emit(
      state.copyWith(
        status: AuthStatus.authenticating,
        clearError: true,
        busyLabel: _saving,
      ),
    );
    try {
      final user = await _guard(_repo.chooseRole(event.role));
      _syncTheme(user);
      emit(state.copyWith(status: _statusFor(user), user: user));
    } catch (e) {
      emit(
        state.copyWith(status: AuthStatus.onboarding, error: friendlyError(e)),
      );
    }
  }

  Future<void> _onOnboardingCompleted(
    AuthOnboardingCompleted event,
    Emitter<AuthState> emit,
  ) async {
    if (state.status == AuthStatus.authenticating) return;
    emit(
      state.copyWith(
        status: AuthStatus.authenticating,
        clearError: true,
        busyLabel: _saving,
      ),
    );
    try {
      final user = await _guard(
        _repo.completeOnboarding(
          role: event.role,
          firstName: event.firstName,
          lastName: event.lastName,
          login: event.login,
          password: event.password,
          about: event.about,
          birthDate: event.birthDate,
          hearAboutUs: event.hearAboutUs,
          hearAboutUsDetail: event.hearAboutUsDetail,
        ),
      );
      _syncTheme(user);
      emit(state.copyWith(status: AuthStatus.authenticated, user: user));
    } catch (e) {
      emit(
        state.copyWith(status: AuthStatus.onboarding, error: friendlyError(e)),
      );
    }
  }

  Future<void> _onLoggedOut(
    AuthLoggedOut event,
    Emitter<AuthState> emit,
  ) async {
    if (state.status == AuthStatus.signingOut) return;
    // avval «Hisobdan çiqilmoqda» animatsiyasi — çiqiş işlari bilan parallel, kamida 2 soniya
    emit(state.copyWith(status: AuthStatus.signingOut));
    await Future.wait([
      () async {
        SmmApi.instance.reset();
        // push öçiriş sekin bölsa ham çiqiş kutib qolmaydi
        await PushService.instance
            .unregister()
            .timeout(const Duration(seconds: 6))
            .catchError((_) {});
        await _repo.logout().timeout(
          const Duration(seconds: 6),
          onTimeout: () {},
        );
      }(),
      Future<void>.delayed(const Duration(milliseconds: 2000)),
    ]);
    emit(const AuthState(status: AuthStatus.unauthenticated));
  }

  Future<void> _onRefresh(
    AuthMeRefreshRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final user = await _repo.refreshMe();
      // shu orada tizimdan chiqilgan bo'lsa — eski javobni qo'llamaymiz
      if (state.status != AuthStatus.authenticated &&
          state.status != AuthStatus.onboarding) {
        return;
      }
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
