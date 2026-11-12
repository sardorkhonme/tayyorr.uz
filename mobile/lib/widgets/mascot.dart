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

/// Böş / xato / internet yöq holatlari uçun yagona blok: maskot, sarlavha, izoh va (ixtiyoriy) tugma.
/// Barça sahifalarda bir xil ölçam va oraliqlar. [card] — röyxat içida karta ramkasida (maskot 140).
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
    this.size = 190,
    this.padding = const EdgeInsets.fromLTRB(24, 8, 24, 24),
    this.card = false,
  });

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

  /// Röyxat içida — WebCard ramkasida.
  final bool card;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Mascot(pose, size: size),
        const SizedBox(height: 12),
        Text(
          title,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: card ? 16 : 18,
            fontWeight: FontWeight.w700,
            height: 1.3,
          ),
        ),
        if (message != null) ...[
          const SizedBox(height: 6),
          Text(
            message!,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: card ? 13 : 14,
              height: 1.45,
            ),
          ),
        ],
        if (actionLabel != null && onAction != null) ...[
          SizedBox(height: card ? 16 : 20),
          WebButton(
            label: actionLabel!,
            leading: actionIcon,
            onPressed: onAction,
          ),
        ],
        if (secondaryLabel != null && onSecondary != null) ...[
          const SizedBox(height: 8),
          WebButton(
            label: secondaryLabel!,
            variant: WebBtn.ghost,
            onPressed: onSecondary,
          ),
        ],
      ],
    );
    if (card) {
      return WebCard(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: content,
      );
    }
    return Padding(
      padding: padding,
      child: Center(child: content),
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
    this.size = 190,
    this.card = false,
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
    this.size = 190,
    this.card = false,
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
  final bool card;

  @override
  Widget build(BuildContext context) {
    final kind = errorKindOf(error, statusCode: statusCode);
    final msg = switch (error) {
      final ApiException e => e.message,
      final String m => m,
      _ => null,
    };
    final s = card ? 140.0 : size;
    return switch (kind) {
      ErrorKind.network => MascotState(
        pose: MascotPose.noInternet,
        title: "Internet yöq",
        message: "Aloqani tekşirib, qayta urinib köring",
        actionLabel: "Qayta urinib köriş",
        actionIcon: TI.refresh_rounded,
        onAction: onRetry,
        size: s,
        card: card,
      ),
      ErrorKind.notFound => MascotState(
        pose: MascotPose.notFound,
        title: notFoundTitle,
        message: notFoundMessage ?? msg,
        actionLabel: notFoundActionLabel,
        onAction: notFoundAction,
        size: s,
        card: card,
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
        size: s,
        card: card,
      ),
    };
  }
}

/// Muvaffaqiyat lahzasi: Tayyor-Man sakrab «zör» deydi. ~1.8 s dan keyin özi yopiladi
/// (yoki «Yaxşi» tugmasi bilan). Yopilgandan keyin Future tugaydi — keyingi navigatsiya şundan söng.
Future<void> showMascotSuccess(
  BuildContext context, {
  required String title,
  String? message,
  Duration autoClose = const Duration(milliseconds: 1800),
}) async {
  final navigator = Navigator.of(context, rootNavigator: true);
  var open = true;
  final done = showGeneralDialog<void>(
    context: context,
    useRootNavigator: true,
    barrierDismissible: true,
    barrierLabel: title,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    transitionDuration: const Duration(milliseconds: 260),
    pageBuilder: (ctx, _, _) => _SuccessCard(title: title, message: message),
    transitionBuilder: (ctx, a, _, child) => FadeTransition(
      opacity: a,
      child: ScaleTransition(
        scale: Tween(
          begin: 0.9,
          end: 1.0,
        ).animate(CurvedAnimation(parent: a, curve: Curves.easeOutBack)),
        child: child,
      ),
    ),
  ).whenComplete(() => open = false);
  Future.delayed(autoClose, () {
    if (open && navigator.mounted) navigator.pop();
  });
  await done;
}

class _SuccessCard extends StatelessWidget {
  const _SuccessCard({required this.title, this.message});
  final String title;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Material(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(28),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: MascotState(
                pose: MascotPose.success,
                title: title,
                message: message,
                size: 170,
                actionLabel: 'Yaxşi',
                onAction: () => Navigator.of(context).maybePop(),
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
