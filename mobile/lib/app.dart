import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/storage/local_storage.dart';
import 'core/update/update_overlay.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/presentation/complete_profile_screen.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/home/session_root.dart';
import 'features/home/section_cubit.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'widgets/session_transitions.dart';

/// Butun ilova uchun bitta Navigator — bloc holati o'zgarganda (kirish,
/// chiqish, ro'yxatdan o'tish) widget daraxtining istalgan chuqurligidan
/// navigatsiya stekini tozalab qayta boshlash uchun ishlatiladi.
final navigatorKey = GlobalKey<NavigatorState>();

class TayyorrApp extends StatelessWidget {
  const TayyorrApp({super.key});

  @override
  Widget build(BuildContext context) {
    // ThemeController o'zgarganda (yorug'/qorong'i) butun daraxt qayta
    // quriladi — shu bilan AppColors'ning statik getterlari yangi
    // qiymatlarni qaytaradi va hamma joy darhol yangilanadi.
    return ListenableBuilder(
      listenable: ThemeController.instance,
      builder: (context, _) {
        return BlocProvider(
          create: (_) => AuthBloc(AuthRepository())..add(const AuthStarted()),
          child: MaterialApp(
            navigatorKey: navigatorKey,
            title: 'Tayyorr.uz',
            debugShowCheckedModeBanner: false,
            theme: ThemeController.instance.isLight
                ? AppTheme.light
                : AppTheme.dark,
            darkTheme: AppTheme.dark,
            themeMode: ThemeController.instance.isLight
                ? ThemeMode.light
                : ThemeMode.dark,
            // KeyedSubtree — rejim almashganda butun ko'rinish daraxti
            // qaytadan tiklanadi (shunchaki qayta qurilmaydi). Bu shart,
            // chunki ko'plab widgetlar `const` bilan yaratiladi va
            // Flutter oddiy qayta qurishda ularni o'tkazib yuboradi —
            // shu bois AppColors'dagi yangi ranglar ko'rinmay qolardi.
            // AuthBloc yuqorida (BlocProvider) qolgani uchun sessiya
            // yo'qolmaydi — faqat vizual daraxt yangilanadi.
            home: KeyedSubtree(
              key: ValueKey(ThemeController.instance.isLight),
              child: const _RootGate(),
            ),
            builder: (context, child) {
              // Navigator ustidan o'ralgan — shuning uchun pushed sahifalar
              // (Profil, Tahrirlash, Chat va h.k.) ostida qolib ketmaydi:
              // status o'zgarishi doim butun stekni tozalab, joriy holatni
              // ko'rsatadi (masalan "Chiqish" har doim ishlashini kafolatlaydi).
              return BlocListener<AuthBloc, AuthState>(
                // ilk aniqlaş (unknown → ...) — birinçi _RootGate özi hal qiladi (kiriş animatsiyasi uzilmasin)
                // kiriş muvaffaqiyatsiz (authenticating → xato bilan qaytdi) — stek tozalanmaydi:
                // foydalanuvçi turgan sahifada (kiriş / röyxatdan ötiş / profilni tugallaş)
                // kiritgan maʼlumotlari bilan qoladi va xato matnini köradi.
                listenWhen: (p, c) =>
                    c.status != AuthStatus.authenticating &&
                    p.status != c.status &&
                    p.status != AuthStatus.unknown &&
                    !(p.status == AuthStatus.authenticating && c.error != null),
                listener: (context, state) {
                  // login/parol (yoki Google, ro'yxatdan ötiş) bilan endigina kirdi — salomlaşiş animatsiyasi
                  if (state.status == AuthStatus.authenticated) {
                    _RootGate.pendingWelcome = _welcomeName(state);
                  }
                  // chiqib, qayta kirganda bosh sahifadan boshlansin
                  if (state.status == AuthStatus.unauthenticated) {
                    SectionCubit.instance.select(AppSection.dashboard);
                  }
                  navigatorKey.currentState?.pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const _RootGate()),
                    (route) => false,
                  );
                },
                // yangilanish / texnik ishlar oynasi — hamma sahifalar ustida
                child: UpdateOverlay(
                  child: _ThemeRebuilder(
                    child: child ?? const SizedBox.shrink(),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

String _welcomeName(AuthState state) {
  final u = state.user;
  final first = u?.firstName?.trim();
  if (first != null && first.isNotEmpty) return first;
  return u?.displayName ?? 'Foydalanuvçi';
}

/// Ilova ochilganda qayerga borishni hal qiladi:
/// avval ~2.6 s kiriş animatsiyasi; so'ng token bor -> Home; yo'q va tanishtiruv ko'rilmagan -> Onboarding;
/// yo'q va tanishtiruv ko'rilgan -> to'g'ridan Login. Kirgan zahoti — salomlaşiş, çiqişda — «Hisobdan çiqilmoqda».
class _RootGate extends StatefulWidget {
  const _RootGate();

  /// Endigina kirgan foydalanuvçi ismi — keyingi _RootGate salomlaşiş ekranini körsatadi.
  static String? pendingWelcome;

  /// Kiriş animatsiyasi bir marta (ilova ochilganda) ijro etiladi.
  static bool introDone = false;

  @override
  State<_RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<_RootGate> {
  String? _welcome;

  /// Oxirgi «turğun» holat (kirilmoqda paytida ostida qaysi sahifa turişi uçun).
  AuthStatus _base = AuthStatus.unauthenticated;

  @override
  void initState() {
    super.initState();
    _welcome = _RootGate.pendingWelcome;
    _RootGate.pendingWelcome = null;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      buildWhen: (p, c) => p.status != c.status || p.busyLabel != c.busyLabel,
      builder: (context, state) {
        final Object key;
        final Widget child;
        if (state.status != AuthStatus.authenticating) _base = state.status;
        if (!_RootGate.introDone) {
          key = 'intro';
          child = IntroSplash(
            ready: state.status != AuthStatus.unknown,
            onFinished: () => setState(() => _RootGate.introDone = true),
          );
        } else if (state.status == AuthStatus.authenticated &&
            _welcome != null) {
          key = 'welcome';
          child = WelcomeScreen(
            name: _welcome!,
            onFinished: () => setState(() => _welcome = null),
          );
        } else {
          // «kirilmoqda» — ostidagi sahifa (kiriş / profilni tugallaş) saqlanadi (kiritilgan
          // maʼlumotlar yöqolmaydi), ustida butun ekranli brend yuklaniş sahifasi
          final base = state.status == AuthStatus.authenticating
              ? _base
              : state.status;
          key = base;
          child = _AuthBusyLayer(
            busy: state.status == AuthStatus.authenticating,
            label: state.busyLabel ?? 'Kirilmoqda...',
            child: _screenFor(base, state),
          );
        }
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 420),
          switchInCurve: Curves.easeOutCubic,
          child: KeyedSubtree(key: ValueKey(key), child: child),
        );
      },
    );
  }

  Widget _screenFor(AuthStatus status, AuthState state) {
    switch (status) {
      case AuthStatus.unknown:
        return const IntroSplash(ready: false);
      case AuthStatus.authenticated:
        return const SessionRoot();
      case AuthStatus.onboarding:
        return const CompleteProfileScreen();
      case AuthStatus.signingOut:
        return SignOutScreen(
          name: state.user == null ? null : _welcomeName(state),
        );
      case AuthStatus.authenticating:
      case AuthStatus.unauthenticated:
        return LocalStorage.instance.hasSeenOnboarding
            ? const LoginScreen()
            : const OnboardingScreen();
    }
  }
}

/// Kirilmoqda / saqlanmoqda paytida — sahifa ustida yumşoq paydo böladigan butun ekranli
/// [BrandLoaderPage] (bosişlar ostiga ötmaydi). Ostidagi sahifa holati saqlanadi.
class _AuthBusyLayer extends StatelessWidget {
  const _AuthBusyLayer({
    required this.busy,
    required this.label,
    required this.child,
  });
  final bool busy;
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        Positioned.fill(
          child: IgnorePointer(
            ignoring: !busy,
            child: AnimatedOpacity(
              opacity: busy ? 1 : 0,
              duration: const Duration(milliseconds: 260),
              curve: Curves.easeOutCubic,
              child: busy
                  ? BrandLoaderPage(label: label)
                  : const SizedBox.shrink(),
            ),
          ),
        ),
      ],
    );
  }
}

/// Mavzu almashganda Navigator ichidagi BARCHA route'larni (push qilingan
/// sahifalar ham) majburan qayta quradi. `const` widgetlar oddiy qayta
/// qurishda o'tkazib yuboriladi va AppColors/WebC'ning yangi ranglari
/// ko'rinmay qolardi — shu bois butun element daraxti belgilanadi.
class _ThemeRebuilder extends StatefulWidget {
  const _ThemeRebuilder({required this.child});
  final Widget child;

  @override
  State<_ThemeRebuilder> createState() => _ThemeRebuilderState();
}

class _ThemeRebuilderState extends State<_ThemeRebuilder> {
  bool? _wasLight;

  @override
  Widget build(BuildContext context) {
    final light = ThemeController.instance.isLight;
    if (_wasLight != null && _wasLight != light) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        void mark(Element e) {
          e.markNeedsBuild();
          e.visitChildren(mark);
        }

        (context as Element).visitChildren(mark);
      });
    }
    _wasLight = light;
    return widget.child;
  }
}
