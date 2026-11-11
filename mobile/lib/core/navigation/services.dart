import 'package:flutter/material.dart';

import '../../app.dart';
import '../../features/home/home_shell.dart';
import '../../features/home/section_cubit.dart';
import '../../features/plus/plus_shell.dart';
import '../../features/smm/smm_shell.dart';

/// Ilova tuzilmasi: bosh sahifa — tayyorr+ qobig'i (Bosh sahifa, Hamyon, Yordam, Qo'llanma, Profil);
/// undan xizmatlarga o'tiladi: Tayyorr.uz (ilmiy ishlar) va Tayyorr SMM — har biri o'z pastki paneli bilan.
enum ServiceKind { plus, uz, smm }

const kUzRoute = '/uz';
const kSmmRoute = '/smm';

/// Hozir ochiq xizmat — ichki (ustiga ochilgan) sahifalar ham qaysi xizmatda ekanini biladi.
final currentService = ValueNotifier<ServiceKind>(ServiceKind.plus);

/// Joriy xizmat (header logosi, support çati filtri va h.k.).
class ServiceScope extends InheritedWidget {
  const ServiceScope({super.key, required this.kind, required super.child});
  final ServiceKind kind;

  static ServiceKind of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ServiceScope>()?.kind ?? currentService.value;

  @override
  bool updateShouldNotify(ServiceScope old) => old.kind != kind;
}

/// Qobiqning pastki paneldagi bo'limlari (orqaga tugmasi o'rniga tayyorr+ tugmasi; tayyorr+ da — headersiz).
class ShellRootScope extends InheritedWidget {
  const ShellRootScope({super.key, required this.kind, required super.child});
  final ServiceKind kind;

  static ServiceKind? of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<ShellRootScope>()?.kind;

  @override
  bool updateShouldNotify(ShellRootScope old) => old.kind != kind;
}

/// Qobiq ochiq turganda joriy xizmatni belgilaydi (yopilganda — tayyorr+).
class ServiceMarker extends StatefulWidget {
  const ServiceMarker({super.key, required this.kind, required this.child});
  final ServiceKind kind;
  final Widget child;

  @override
  State<ServiceMarker> createState() => _ServiceMarkerState();
}

class _ServiceMarkerState extends State<ServiceMarker> {
  @override
  void initState() {
    super.initState();
    currentService.value = widget.kind;
  }

  @override
  void dispose() {
    if (currentService.value == widget.kind) currentService.value = ServiceKind.plus;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ServiceScope(kind: widget.kind, child: widget.child);
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
    // boshqa xizmat ochiq bo'lsa — avval bosh sahifaga, keyin yangisi
    nav.popUntil((r) => r.isFirst);
    nav.push(MaterialPageRoute(settings: RouteSettings(name: name), builder: (_) => build()));
  }
}

/// Tayyorr.uz bo'limini ochish (istalgan joydan).
void openUzSection(AppSection section) {
  SectionCubit.instance.select(section);
  _bringShell(kUzRoute, () => const HomeShell());
}

/// Tayyorr SMM ni ochish. [tab] — 0 xizmatlar, 1 chegirmalar, 2 buyurtmalar, 3 hamyon, 4 profil.
void openSmm([int? tab]) {
  if (tab != null) SmmShell.tab.value = tab;
  _bringShell(kSmmRoute, () => const SmmShell());
}

/// Bosh sahifaga (tayyorr+) qaytish. [tab] — tayyorr+ qobig'ining bo'limi.
void openHub([int? tab]) {
  if (tab != null) PlusShell.tab.value = tab;
  navigatorKey.currentState?.popUntil((r) => r.isFirst);
}
