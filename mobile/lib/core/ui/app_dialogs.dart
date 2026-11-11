import 'package:tayyorr_app/core/ui/ticons.dart';
import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Ilovaning yagona zamonaviy oyna uslubi: tasdiqlash oynasi, pastdan chiqadigan panel (sheet),
/// qisqa xabar (toast) va ruxsat so'rashdan oldingi tushuntirish oynasi.
/// Hammasi: yumshoq blur fon, katta burchak, gradient tugmalar, silliq animatsiya.

const kBrandGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xFF8B5CF6), Color(0xFF6366F1), Color(0xFF3B82F6)],
);

const kDangerGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xFFF43F5E), Color(0xFFE11D48)],
);

Color get _panelColor => AppColors.isLight ? Colors.white : const Color(0xFF15151F);
Color get _barrier => AppColors.isLight ? const Color(0xFF18181B).withValues(alpha: 0.35) : Colors.black.withValues(alpha: 0.6);

/// Gradient (yoki oddiy) tugma — oynalar ichida.
class AppDialogButton extends StatelessWidget {
  const AppDialogButton({super.key, required this.label, this.onTap, this.primary = true, this.danger = false, this.busy = false});
  final String label;
  final VoidCallback? onTap;
  final bool primary;
  final bool danger;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final grad = primary ? (danger ? kDangerGradient : kBrandGradient) : null;
    return GestureDetector(
      onTap: busy ? null : onTap,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: onTap == null ? 0.5 : 1,
        child: Container(
          height: 50,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: grad,
            color: grad == null ? AppColors.tint(0.06) : null,
            borderRadius: BorderRadius.circular(16),
            border: grad == null ? Border.all(color: AppColors.tint(0.1)) : null,
            boxShadow: grad == null
                ? null
                : [
                    BoxShadow(
                      color: (danger ? const Color(0xFFE11D48) : const Color(0xFF6366F1)).withValues(alpha: 0.35),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                      spreadRadius: -6,
                    ),
                  ],
          ),
          child: busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
              : Text(
                  label,
                  style: TextStyle(
                    color: grad == null ? AppColors.textPrimary : Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
      ),
    );
  }
}

/// Doira ichidagi ikonka (gradient yoki rangli fon).
class AppDialogIcon extends StatelessWidget {
  const AppDialogIcon(this.icon, {super.key, this.danger = false, this.color});
  final TIData icon;
  final bool danger;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? (danger ? const Color(0xFFF43F5E) : const Color(0xFF6366F1));
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: c.withValues(alpha: 0.12),
        border: Border.all(color: c.withValues(alpha: 0.25), width: 1.5),
      ),
      child: TIcon(icon, color: c, size: 30),
    );
  }
}

Route<T> _dialogRoute<T>(BuildContext context, WidgetBuilder builder, {bool dismissible = true}) {
  return PageRouteBuilder<T>(
    opaque: false,
    barrierDismissible: dismissible,
    barrierColor: Colors.transparent,
    transitionDuration: const Duration(milliseconds: 260),
    reverseTransitionDuration: const Duration(milliseconds: 180),
    pageBuilder: (ctx, _, __) => builder(ctx),
    transitionsBuilder: (ctx, a, _, child) {
      final curved = CurvedAnimation(parent: a, curve: Curves.easeOutBack, reverseCurve: Curves.easeIn);
      return Stack(children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: dismissible ? () => Navigator.of(ctx).maybePop() : null,
            child: FadeTransition(
              opacity: a,
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                child: Container(color: _barrier),
              ),
            ),
          ),
        ),
        FadeTransition(
          opacity: a,
          child: ScaleTransition(scale: Tween(begin: 0.9, end: 1.0).animate(curved), child: child),
        ),
      ]);
    },
  );
}

/// Markazdagi kartochka (oynaning o'zi).
class AppDialogCard extends StatelessWidget {
  const AppDialogCard({super.key, required this.child, this.maxWidth = 400});
  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
        child: Material(
          type: MaterialType.transparency,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Container(
              padding: const EdgeInsets.fromLTRB(22, 26, 22, 20),
              decoration: BoxDecoration(
                color: _panelColor,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: AppColors.tint(0.08)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 50, offset: const Offset(0, 20), spreadRadius: -12)],
              ),
              child: SingleChildScrollView(child: child),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tasdiqlash oynasi: ikonka, sarlavha, matn va ikki tugma. `danger` — qizil (o'chirish, chiqish va h.k.).
Future<bool?> showAppConfirm(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'Ha',
  String cancelLabel = 'Bekor',
  TIData? icon,
  bool danger = false,
}) {
  return Navigator.of(context, rootNavigator: true).push<bool>(_dialogRoute(context, (ctx) {
    return AppDialogCard(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        AppDialogIcon(icon ?? (danger ? TI.warning_amber_rounded : TI.help_outline_rounded), danger: danger),
        const SizedBox(height: 16),
        Text(title,
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textPrimary, fontSize: 19, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
        const SizedBox(height: 8),
        Text(message, textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 14.5, height: 1.45)),
        const SizedBox(height: 22),
        Row(children: [
          Expanded(child: AppDialogButton(label: cancelLabel, primary: false, onTap: () => Navigator.of(ctx).pop(false))),
          const SizedBox(width: 10),
          Expanded(child: AppDialogButton(label: confirmLabel, danger: danger, onTap: () => Navigator.of(ctx).pop(true))),
        ]),
      ]),
    );
  }));
}

/// Erkin tarkibli oyna (forma va h.k.) — xuddi shu uslubda.
Future<T?> showAppDialog<T>(BuildContext context, {required WidgetBuilder builder, bool dismissible = true}) {
  return Navigator.of(context, rootNavigator: true).push<T>(_dialogRoute(context, (ctx) => AppDialogCard(child: builder(ctx)), dismissible: dismissible));
}

/// Pastdan chiqadigan panel: tutqich, sarlavha (ixtiyoriy), katta yuqori burchaklar.
Future<T?> showAppSheet<T>(BuildContext context, {required WidgetBuilder builder, String? title, bool scrollable = true, bool closable = true}) {
  return showModalBottomSheet<T>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: _barrier,
    builder: (ctx) {
      final body = Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 5,
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(color: AppColors.tint(0.2), borderRadius: BorderRadius.circular(9)),
            ),
          ),
          if (title != null || closable) ...[
            Row(children: [
              Expanded(
                child: title == null
                    ? const SizedBox()
                    : Text(title, style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
              ),
              if (closable)
                GestureDetector(
                  onTap: () => Navigator.of(ctx).maybePop(),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.tint(0.08)),
                    child: Center(child: TIcon(TI.close_rounded, size: 18, color: AppColors.textSecondary)),
                  ),
                ),
            ]),
            const SizedBox(height: 12),
          ],
          builder(ctx),
        ],
      );
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(ctx).height * 0.92),
          child: Container(
            padding: EdgeInsets.fromLTRB(20, 10, 20, 20 + MediaQuery.paddingOf(ctx).bottom),
            decoration: BoxDecoration(
              color: _panelColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              border: Border(top: BorderSide(color: AppColors.tint(0.08))),
            ),
            child: scrollable ? SingleChildScrollView(child: body) : body,
          ),
        ),
      );
    },
  );
}

/// Sheet ichidagi amal qatori (ikonka + yozuv).
class AppSheetAction extends StatelessWidget {
  const AppSheetAction({super.key, required this.icon, required this.label, required this.onTap, this.danger = false, this.trailing});
  final TIData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = danger ? const Color(0xFFF43F5E) : AppColors.textPrimary;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
        child: Row(children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: (danger ? const Color(0xFFF43F5E) : const Color(0xFF6366F1)).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TIcon(icon, size: 19, color: danger ? const Color(0xFFF43F5E) : const Color(0xFF818CF8)),
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: TextStyle(color: c, fontSize: 15, fontWeight: FontWeight.w600))),
          if (trailing != null) trailing!,
        ]),
      ),
    );
  }
}

enum ToastKind { info, success, error }

OverlayEntry? _toastEntry;
Timer? _toastTimer;

/// Qisqa xabar — ekran pastida suzib chiqadi va o'zi yo'qoladi.
void showToast(BuildContext context, String message, {ToastKind kind = ToastKind.info}) {
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;
  _toastTimer?.cancel();
  _toastEntry?.remove();
  final key = GlobalKey<_ToastState>();
  final entry = OverlayEntry(builder: (_) => _Toast(key: key, message: message, kind: kind));
  _toastEntry = entry;
  overlay.insert(entry);
  _toastTimer = Timer(const Duration(milliseconds: 2600), () async {
    await key.currentState?.hide();
    if (_toastEntry == entry) {
      entry.remove();
      _toastEntry = null;
    }
  });
}

class _Toast extends StatefulWidget {
  const _Toast({super.key, required this.message, required this.kind});
  final String message;
  final ToastKind kind;

  @override
  State<_Toast> createState() => _ToastState();
}

class _ToastState extends State<_Toast> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 280))..forward();

  Future<void> hide() async {
    if (mounted) await _c.reverse();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (widget.kind) {
      ToastKind.success => (TI.check_circle_rounded, const Color(0xFF10B981)),
      ToastKind.error => (TI.error_rounded, const Color(0xFFF43F5E)),
      ToastKind.info => (TI.info_rounded, const Color(0xFF818CF8)),
    };
    final bottom = MediaQuery.paddingOf(context).bottom + 96;
    return Positioned(
      left: 16,
      right: 16,
      bottom: bottom,
      child: IgnorePointer(
        child: FadeTransition(
          opacity: _c,
          child: SlideTransition(
            position: Tween(begin: const Offset(0, 0.6), end: Offset.zero).animate(CurvedAnimation(parent: _c, curve: Curves.easeOutCubic)),
            child: Center(
              child: Material(
                type: MaterialType.transparency,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                      decoration: BoxDecoration(
                        color: const Color(0xFF18181F).withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        TIcon(icon, color: color, size: 20),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(widget.message,
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600, height: 1.35)),
                        ),
                      ]),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tizim ruxsati so'ralishidan oldin — nima uchun kerakligini tushuntiradigan chiroyli oyna.
/// true — foydalanuvchi "Ruxsat berish"ni bosdi (keyin tizim oynasi chiqariladi).
Future<bool> showPermissionPrompt(
  BuildContext context, {
  required TIData icon,
  required String title,
  required String message,
  List<String> points = const [],
  String allowLabel = 'Ruxsat beriş',
  String laterLabel = 'Keyinroq',
}) async {
  final r = await showAppSheet<bool>(
    context,
    builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 76,
        height: 76,
        decoration: BoxDecoration(
          gradient: kBrandGradient,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.4), blurRadius: 30, offset: const Offset(0, 12), spreadRadius: -8)],
        ),
        child: TIcon(icon, color: Colors.white, size: 36),
      ),
      const SizedBox(height: 18),
      Text(title, textAlign: TextAlign.center, style: TextStyle(color: AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
      const SizedBox(height: 8),
      Text(message, textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 14.5, height: 1.45)),
      if (points.isNotEmpty) ...[
        const SizedBox(height: 16),
        for (final p in points)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: [
              const TIcon(TI.check_circle_rounded, color: Color(0xFF10B981), size: 18),
              const SizedBox(width: 10),
              Expanded(child: Text(p, style: TextStyle(color: AppColors.textPrimary, fontSize: 14, height: 1.35))),
            ]),
          ),
      ],
      const SizedBox(height: 18),
      AppDialogButton(label: allowLabel, onTap: () => Navigator.of(ctx).pop(true)),
      const SizedBox(height: 8),
      TextButton(
        onPressed: () => Navigator.of(ctx).pop(false),
        child: Text(laterLabel, style: TextStyle(color: AppColors.textMuted, fontSize: 14.5)),
      ),
    ]),
  );
  return r == true;
}
