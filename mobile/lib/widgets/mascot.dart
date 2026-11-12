import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../core/network/api_exception.dart';
import '../core/theme/app_colors.dart';
import '../core/ui/ticons.dart';
import 'web_ui.dart';

/// «Tayyor-Man» — brend maskoti. Rasmlar `assets/mascot/` da (asl PNG lardan lossless WebP:
/// pikselma-piksel bir xil, faqat fayl hajmi kiçikroq). Rasmning özi özgartirilmaydi.
enum MascotPose {
  onboard1('onboard-1'),
  onboard2('onboard-2'),
  onboard3('onboard-3'),
  noInternet('no-internet'),
  emptyOrders('empty-orders'),
  emptyFeed('empty-feed'),
  emptyOffers('empty-offers'),
  emptyDiscounts('empty-discounts'),
  noResults('no-results'),
  error('error'),
  maintenance('maintenance'),
  update('update'),
  welcome('welcome'),
  goodbye('goodbye'),
  success('success'),
  walletEmpty('wallet-empty'),
  notFound('not-found');

  const MascotPose(this.file);
  final String file;
  String get asset => 'assets/mascot/$file.webp';
}

/// Maskot rasmi: paydo bölganda yumşoq kattalaşib kiradi, keyin sekin «suzib» turadi.
class Mascot extends StatefulWidget {
  const Mascot(
    this.pose, {
    super.key,
    this.size = 200,
    this.float = true,
    this.entrance = true,
  });

  final MascotPose pose;
  final double size;

  /// Sekin tepaga-pastga tebraniş.
  final bool float;

  /// Kirib keliş animatsiyasi.
  final bool entrance;

  @override
  State<Mascot> createState() => _MascotState();
}

/// Rasmlarni oldindan xotiraga yuklaş — ekranda keçikmasdan darhol çiqadi.
Future<void> precacheMascots(
  BuildContext context,
  Iterable<MascotPose> poses,
) => Future.wait([
  for (final p in poses)
    precacheImage(AssetImage(p.asset), context).catchError((_) {}),
]);

class _MascotState extends State<Mascot> with TickerProviderStateMixin {
  late final AnimationController _in = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 650),
    value: widget.entrance ? 0 : 1,
  )..forward();
  late final AnimationController _loop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3200),
  );

  @override
  void initState() {
    super.initState();
    if (widget.float) _loop.repeat();
  }

  @override
  void dispose() {
    _in.dispose();
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      widget.pose.asset,
      width: widget.size,
      height: widget.size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      gaplessPlayback: true,
      excludeFromSemantics: true,
    );
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: Listenable.merge([_in, _loop]),
        child: image,
        builder: (context, child) {
          final a = Curves.easeOutBack.transform(_in.value);
          final f = Curves.easeOut.transform(_in.value);
          final dy = widget.float
              ? math.sin(_loop.value * 2 * math.pi) * 6
              : 0.0;
          return Opacity(
            opacity: f.clamp(0.0, 1.0),
            child: Transform.translate(
              offset: Offset(0, dy + 16 * (1 - f)),
              child: Transform.scale(scale: 0.85 + 0.15 * a, child: child),
            ),
          );
        },
      ),
    );
  }
}

/// Böş / xato / internet yöq holatlari uçun yagona blok: katta maskot (ramkasiz), sarlavha,
/// izoh va (ixtiyoriy) tugma. Barça sahifalarda bir xil ölçam va oraliqlar.
/// [fill] — röyxat / sahifa içida bösh joyning örtasida turadi (ekran balandligining ~58%).
class MascotState extends StatelessWidget {
  const MascotState({
    super.key,
    required this.pose,
    required this.title,
    this.message,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
    this.secondaryLabel,
    this.onSecondary,
    this.size = 250,
    this.padding = const EdgeInsets.fromLTRB(24, 8, 24, 24),
    this.fill = true,
    this.action,
  });

  /// Tayyor tugma (masalan boşqa uslubdagi) — [actionLabel] örniga.
  final Widget? action;

  final MascotPose pose;
  final String title;
  final String? message;
  final String? actionLabel;
  final TIData? actionIcon;
  final VoidCallback? onAction;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final double size;
  final EdgeInsets padding;

  /// Bösh joyni egallab, örtada turadi (böş sahifa / xato). `false` — bölim içida (ixçam).
  final bool fill;

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.sizeOf(context);
    // past ekranlarda maskot ham moslaşadi (lekin kiçik emas)
    final side = math.min(size, screen.height * 0.34).clamp(140.0, size);
    final content = ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Mascot(pose, size: side),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.w700,
              height: 1.3,
            ),
          ),
          if (message != null && message!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14.5,
                height: 1.45,
              ),
            ),
          ],
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 22),
            WebButton(
              label: actionLabel!,
              leading: actionIcon,
              onPressed: onAction,
            ),
          ],
          if (action != null) ...[const SizedBox(height: 22), action!],
          if (secondaryLabel != null && onSecondary != null) ...[
            const SizedBox(height: 8),
            WebButton(
              label: secondaryLabel!,
              variant: WebBtn.ghost,
              onPressed: onSecondary,
            ),
          ],
        ],
      ),
    );
    return Padding(
      padding: padding,
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: fill ? screen.height * 0.58 : 0),
        child: Center(child: content),
      ),
    );
  }
}

/// Xato turi: internet yöq / topilmadi (404) / boşqa.
enum ErrorKind { network, notFound, other }

/// Har qanday xatoni (ApiException, DioException, SocketException, TimeoutException yoki
/// cubitda saqlangan matn) turga ajratadi.
ErrorKind errorKindOf(Object? error, {int? statusCode}) {
  if (statusCode == 404) return ErrorKind.notFound;
  return switch (error) {
    final ApiException e
        when e.network || ApiException.isNetworkMessage(e.message) =>
      ErrorKind.network,
    final ApiException e when e.notFound => ErrorKind.notFound,
    SocketException() ||
    TimeoutException() ||
    HttpException() => ErrorKind.network,
    final DioException e
        when e.response == null &&
            (e.type == DioExceptionType.connectionError ||
                e.type == DioExceptionType.connectionTimeout ||
                e.type == DioExceptionType.receiveTimeout ||
                e.type == DioExceptionType.sendTimeout ||
                e.error is SocketException) =>
      ErrorKind.network,
    final DioException e when e.response?.statusCode == 404 =>
      ErrorKind.notFound,
    final String m when ApiException.isNetworkMessage(m) => ErrorKind.network,
    _ => ErrorKind.other,
  };
}

/// Yuklaşdagi xato uçun yagona blok: internet yöq bölsa — `no-internet` maskoti,
/// topilmasa (404) — `not-found`, aks holda — `error`. Tarmoq / boşqa xatoda «Qayta urinib köriş».
class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    required this.error,
    this.onRetry,
    this.statusCode,
    this.notFoundTitle = 'Topilmadi',
    this.notFoundMessage,
    this.notFoundAction,
    this.notFoundActionLabel,
    this.size = 250,
    this.fill = true,
  });

  /// Qisqa yozuv: `ErrorState.from(error, onRetry)`.
  const ErrorState.from(
    this.error,
    this.onRetry, {
    super.key,
    this.statusCode,
    this.notFoundTitle = 'Topilmadi',
    this.notFoundMessage,
    this.notFoundAction,
    this.notFoundActionLabel,
    this.size = 250,
    this.fill = true,
  });

  /// ApiException, DioException, SocketException, TimeoutException yoki xato matni.
  final Object? error;
  final VoidCallback? onRetry;

  /// Cubit xatoni matn sifatida saqlasa — HTTP kodi alohida (404 → topilmadi).
  final int? statusCode;
  final String notFoundTitle;
  final String? notFoundMessage;
  final VoidCallback? notFoundAction;
  final String? notFoundActionLabel;
  final double size;

  /// [MascotState.fill].
  final bool fill;

  @override
  Widget build(BuildContext context) {
    final kind = errorKindOf(error, statusCode: statusCode);
    final msg = switch (error) {
      final ApiException e => e.message,
      final String m => m,
      _ => null,
    };
    return switch (kind) {
      ErrorKind.network => MascotState(
        pose: MascotPose.noInternet,
        title: "Internet yöq",
        message: "Aloqani tekşirib, qayta urinib köring",
        actionLabel: "Qayta urinib köriş",
        actionIcon: TI.refresh_rounded,
        onAction: onRetry,
        size: size,
        fill: fill,
      ),
      ErrorKind.notFound => MascotState(
        pose: MascotPose.notFound,
        title: notFoundTitle,
        message: notFoundMessage ?? msg,
        actionLabel: notFoundActionLabel,
        onAction: notFoundAction,
        size: size,
        fill: fill,
      ),
      ErrorKind.other => MascotState(
        pose: MascotPose.error,
        title: "Nimadir xato ketdi",
        message:
            (msg == null ||
                msg.trim().isEmpty ||
                msg.startsWith('Nimadir xato ketdi'))
            ? "Birozdan keyin qayta urinib köring"
            : msg,
        actionLabel: "Qayta urinib köriş",
        actionIcon: TI.refresh_rounded,
        onAction: onRetry,
        size: size,
        fill: fill,
      ),
    };
  }
}

/// Muvaffaqiyat lahzasi: Tayyor-Man sakrab «zör» deydi. Ekran örtasida — yaxlit (şaffof emas)
/// karta: katta maskot, sarlavha, izoh va «Yaxşi». ~3.5 s turadi (pastdagi ingiçka çiziq qolgan
/// vaqtni körsatadi) yoki «Yaxşi» bosilguncha. Yopilgandan keyin Future tugaydi.
Future<void> showMascotSuccess(
  BuildContext context, {
  required String title,
  String? message,
  Duration autoClose = const Duration(milliseconds: 3500),
}) => _showMascotDialog(
  context,
  pose: MascotPose.success,
  accent: const Color(0xFF10B981),
  title: title,
  message: message,
  button: 'Yaxşi',
  autoClose: autoClose,
);

/// Xato oynasi: Tayyor-Man `error` holatida, sarlavha va tuşunarli matn. Özi yopilmaydi —
/// «Tuşunarli» bosilguncha (yoki fon bosilguncha) turadi.
Future<void> showMascotError(
  BuildContext context, {
  required String title,
  String? message,
  MascotPose pose = MascotPose.error,
}) => _showMascotDialog(
  context,
  pose: pose,
  accent: const Color(0xFFF43F5E),
  title: title,
  message: message,
  button: 'Tuşunarli',
);

Future<void> _showMascotDialog(
  BuildContext context, {
  required MascotPose pose,
  required Color accent,
  required String title,
  String? message,
  required String button,
  Duration? autoClose,
}) async {
  final navigator = Navigator.of(context, rootNavigator: true);
  var open = true;
  final done = showGeneralDialog<void>(
    context: context,
    useRootNavigator: true,
    barrierDismissible: true,
    barrierLabel: title,
    barrierColor: Colors.black.withValues(alpha: 0.55),
    transitionDuration: const Duration(milliseconds: 320),
    pageBuilder: (ctx, _, _) => _SuccessCard(
      pose: pose,
      accent: accent,
      title: title,
      message: message,
      button: button,
      duration: autoClose,
    ),
    transitionBuilder: (ctx, a, _, child) => FadeTransition(
      opacity: CurvedAnimation(parent: a, curve: Curves.easeOut),
      child: ScaleTransition(
        scale: Tween(
          begin: 0.88,
          end: 1.0,
        ).animate(CurvedAnimation(parent: a, curve: Curves.easeOutBack)),
        child: child,
      ),
    ),
  ).whenComplete(() => open = false);
  if (autoClose != null) {
    Future.delayed(autoClose, () {
      if (open && navigator.mounted) navigator.pop();
    });
  }
  await done;
}

class _SuccessCard extends StatefulWidget {
  const _SuccessCard({
    required this.pose,
    required this.accent,
    required this.title,
    this.message,
    required this.button,
    this.duration,
  });
  final MascotPose pose;
  final Color accent;
  final String title;
  final String? message;
  final String button;

  /// null — özi yopilmaydi (vaqt çizig'i ham yöq).
  final Duration? duration;

  @override
  State<_SuccessCard> createState() => _SuccessCardState();
}

class _SuccessCardState extends State<_SuccessCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _t = AnimationController(
    vsync: this,
    duration: widget.duration ?? const Duration(seconds: 1),
  );

  @override
  void initState() {
    super.initState();
    if (widget.duration != null) _t.forward();
  }

  @override
  void dispose() {
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final surface = light ? Colors.white : const Color(0xFF15151F);
    final side = math.min(220.0, MediaQuery.sizeOf(context).height * 0.3);
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Material(
            color: surface,
            elevation: 0,
            borderRadius: BorderRadius.circular(30),
            clipBehavior: Clip.antiAlias,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: AppColors.cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: light ? 0.18 : 0.5),
                    blurRadius: 40,
                    offset: const Offset(0, 18),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.only(top: 22),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          widget.accent.withValues(alpha: light ? 0.14 : 0.18),
                          surface,
                        ],
                      ),
                    ),
                    child: Center(child: Mascot(widget.pose, size: side)),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 10, 24, 22),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.title,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 21,
                            fontWeight: FontWeight.w800,
                            height: 1.25,
                            decoration: TextDecoration.none,
                          ),
                        ),
                        if (widget.message != null &&
                            widget.message!.trim().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            widget.message!,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14.5,
                              height: 1.45,
                              decoration: TextDecoration.none,
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        WebButton(
                          label: widget.button,
                          expand: true,
                          onPressed: () => Navigator.of(context).maybePop(),
                        ),
                      ],
                    ),
                  ),
                  // avtomatik yopiliş vaqti
                  if (widget.duration != null)
                    AnimatedBuilder(
                      animation: _t,
                      builder: (_, _) => Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: 1 - _t.value,
                          child: Container(height: 3, color: widget.accent),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
