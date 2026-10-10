import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/storage/local_storage.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/presentation/complete_profile_screen.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/home/home_shell.dart';
import 'features/home/section_cubit.dart';
import 'features/onboarding/onboarding_screen.dart';

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
            theme: ThemeController.instance.isLight ? AppTheme.light : AppTheme.dark,
            darkTheme: AppTheme.dark,
            themeMode: ThemeController.instance.isLight ? ThemeMode.light : ThemeMode.dark,
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
                listenWhen: (p, c) =>
                    c.status != AuthStatus.authenticating && p.status != c.status,
                listener: (context, state) {
                  // chiqib, qayta kirganda bosh sahifadan boshlansin
                  if (state.status == AuthStatus.unauthenticated) {
                    SectionCubit.instance.select(AppSection.dashboard);
                  }
                  navigatorKey.currentState?.pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const _RootGate()),
                    (route) => false,
                  );
                },
                child: child ?? const SizedBox.shrink(),
              );
            },
          ),
        );
      },
    );
  }
}

/// Ilova ochilganda qayerga borishni hal qiladi:
/// token bor -> Home; yo'q va tanishtiruv ko'rilmagan -> Onboarding;
/// yo'q va tanishtiruv ko'rilgan -> to'g'ridan Login.
class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        switch (state.status) {
          case AuthStatus.unknown:
            return const _SplashScreen();
          case AuthStatus.authenticated:
            return const HomeShell();
          case AuthStatus.onboarding:
            return const CompleteProfileScreen();
          case AuthStatus.authenticating:
          case AuthStatus.unauthenticated:
            return LocalStorage.instance.hasSeenOnboarding
                ? const LoginScreen()
                : const OnboardingScreen();
        }
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: const Center(
        child: CircularProgressIndicator(color: AppColors.indigo),
      ),
    );
  }
}
