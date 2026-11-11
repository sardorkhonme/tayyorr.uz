import 'package:flutter/material.dart';

import '../../app.dart';
import '../../features/home/home_shell.dart';
import '../../features/home/section_cubit.dart';
import '../../features/smm/smm_shell.dart';

/// Ilova tuzilmasi: bosh sahifa — tayyorr+ (xizmatlar markazi); undan xizmatlarga o'tiladi:
/// Tayyorr.uz (ilmiy ishlar) va Tayyorr SMM. Har biri — o'z pastki paneli bilan alohida qobiq.
enum ServiceKind { plus, uz, smm }

const kUzRoute = '/uz';
const kSmmRoute = '/smm';

/// Joriy xizmat (header logosi va h.k. uchun).
class ServiceScope extends InheritedWidget {
  const ServiceScope({super.key, required this.kind, required super.child});
  final ServiceKind kind;

  static ServiceKind of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ServiceScope>()?.kind ?? ServiceKind.plus;

  @override
  bool updateShouldNotify(ServiceScope old) => old.kind != kind;
}

/// Qobiqni ochadi: stekda bo'lsa — o'shangacha qaytadi, bo'lmasa — bosh sahifa ustiga ochadi.
void _bringShell(String name, Widget Function() build) {
  final nav = navigatorKey.currentState;
  if (nav == null) return;
  var found = false;
  nav.popUntil((r) {
    if (r.settings.name == name) found = true;
    return found || r.isFirst;
  });
  if (!found) {
    nav.push(MaterialPageRoute(settings: RouteSettings(name: name), builder: (_) => build()));
  }
}

/// Tayyorr.uz bo'limini ochish (istalgan joydan).
void openUzSection(AppSection section) {
  SectionCubit.instance.select(section);
  _bringShell(kUzRoute, () => const HomeShell());
}

/// Tayyorr SMM ni ochish. [tab] — 0 xizmatlar, 1 chegirmalar, 2 buyurtmalar, 3 hamyon.
void openSmm([int? tab]) {
  if (tab != null) SmmShell.tab.value = tab;
  _bringShell(kSmmRoute, () => const SmmShell());
}

/// Bosh sahifaga (tayyorr+) qaytish.
void openHub() => navigatorKey.currentState?.popUntil((r) => r.isFirst);
