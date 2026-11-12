import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Profil rasmi: bo'lsa — oddiy dumaloq rasm, bo'lmasa — sekin
/// aylanadigan animatsiyali gradient + bosh harf. Hech qanday soya/halo yo'q.
class UserAvatar extends StatefulWidget {
  const UserAvatar({
    super.key,
    this.imageUrl,
    required this.initial,
    this.size = 36,
    this.onTap,
  });

  final String? imageUrl;
  final String initial;
  final double size;
  final VoidCallback? onTap;

  @override
  State<UserAvatar> createState() => _UserAvatarState();
}

class _UserAvatarState extends State<UserAvatar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 7),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = (widget.imageUrl ?? '').isNotEmpty;

    return GestureDetector(
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: widget.size,
        height: widget.size,
        padding: const EdgeInsets.all(1.4),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: [AppColors.indigo, AppColors.violet],
          ),
        ),
        child: ClipOval(
          child: Container(
            color: AppColors.surface,
            child: hasImage
                ? Image.network(
                    widget.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _InitialFallback(
                      initial: widget.initial,
                      controller: _ctrl,
                      size: widget.size,
                    ),
                  )
                : _InitialFallback(
                    initial: widget.initial,
                    controller: _ctrl,
                    size: widget.size,
                  ),
          ),
        ),
      ),
    );
  }
}

class _InitialFallback extends StatelessWidget {
  const _InitialFallback({
    required this.initial,
    required this.controller,
    required this.size,
  });

  final String initial;
  final AnimationController controller;
  final double size;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: SweepGradient(
            transform: GradientRotation(controller.value * 6.28319),
            colors: const [
              AppColors.indigo,
              AppColors.violet,
              AppColors.indigoStrong,
              AppColors.indigo,
            ],
          ),
        ),
        child: Text(
          initial,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: size * 0.38,
          ),
        ),
      ),
    );
  }
}
