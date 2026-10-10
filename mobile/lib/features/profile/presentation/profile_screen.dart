import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/danger_button.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/user_avatar.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../auth/data/auth_repository.dart';
import 'edit_profile_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _repo = AuthRepository();
  final _picker = ImagePicker();
  bool _uploadingAvatar = false;

  Future<void> _pickAvatar() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, maxWidth: 800, imageQuality: 85);
    if (file == null) return;
    setState(() => _uploadingAvatar = true);
    try {
      final bytes = await file.readAsBytes();
      final ext = file.name.contains('.') ? file.name.split('.').last.toLowerCase() : 'jpg';
      final contentType = switch (ext) {
        'png' => 'image/png',
        'webp' => 'image/webp',
        _ => 'image/jpeg',
      };
      await _repo.uploadAvatar(bytes: bytes, filename: file.name, contentType: contentType);
      if (mounted) context.read<AuthBloc>().add(const AuthMeRefreshRequested());
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Rasmni yuklab bo'lmadi — qayta urinib ko'ring")),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          final user = state.user;
          return CustomScrollView(
            slivers: [
              const AppHeaderSliver(),
              if (user == null)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  sliver: SliverList.list(children: [
                    GlassCard(
                      blur: false,
                      child: Row(
                        children: [
                          const SCircle(size: 58),
                          const SizedBox(width: 14),
                          SBar(width: MediaQuery.of(context).size.width * 0.35, height: 17),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Row(children: [
                      Expanded(child: SBlock(height: 68)),
                      SizedBox(width: 10),
                      Expanded(child: SBlock(height: 68)),
                    ]),
                  ]),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      GlassCard(
                        blur: false,
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: _uploadingAvatar ? null : _pickAvatar,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  UserAvatar(imageUrl: user.image, initial: _initial(user.displayName), size: 58),
                                  if (_uploadingAvatar)
                                    Container(
                                      width: 58,
                                      height: 58,
                                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.black45),
                                      child: const Padding(
                                        padding: EdgeInsets.all(16),
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                      ),
                                    )
                                  else
                                    Positioned(
                                      bottom: -2,
                                      right: -2,
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: const BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: AppColors.indigo,
                                        ),
                                        child: const Icon(Icons.camera_alt_rounded, size: 12, color: Colors.white),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    user.displayName,
                                    style: TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 17,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '@${user.login ?? "—"} · ${user.roleLabel}',
                                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                              ),
                              icon: Icon(Icons.edit_outlined, color: AppColors.textSecondary, size: 20),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: _StatCard(label: 'Balans', value: formatSom(user.balance))),
                          if (user.isPreparer) ...[
                            const SizedBox(width: 10),
                            Expanded(child: _StatCard(label: 'Star', value: '${user.starBalance} ⭐')),
                          ],
                        ],
                      ),
                      if (user.isPreparer) ...[
                        const SizedBox(height: 10),
                        _StatCard(
                          label: 'Reyting',
                          value: user.rating != null
                              ? '${user.rating!.toStringAsFixed(1)} · ${user.ratingCount} baho'
                              : "Hali baho yo'q",
                        ),
                      ],
                      if ((user.walletCode ?? '').isNotEmpty) ...[
                        const SizedBox(height: 10),
                        _StatCard(label: 'Hisob kodi', value: user.walletCode!),
                      ],
                      const SizedBox(height: 10),
                      if ((user.about ?? '').isNotEmpty)
                        GlassCard(
                          blur: false,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("O'zi haqida",
                                  style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                              const SizedBox(height: 6),
                              Text(user.about!,
                                  style: TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.4)),
                            ],
                          ),
                        ),
                      const SizedBox(height: 24),
                      DangerButton(
                        label: 'Chiqish',
                        icon: Icons.logout_rounded,
                        onPressed: () async {
                          final ok = await confirmDialog(
                            context,
                            title: 'Chiqmoqchimisiz?',
                            message: 'Hisobingizdan chiqasiz, qaytadan kirishingiz kerak bo\'ladi.',
                            confirmLabel: 'Ha, chiqish',
                          );
                          if (ok == true && context.mounted) {
                            context.read<AuthBloc>().add(const AuthLoggedOut());
                          }
                        },
                      ),
                    ]),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      blur: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

String _initial(String name) {
  final clean = name.replaceFirst('@', '').trim();
  return clean.isEmpty ? '?' : clean.substring(0, 1).toUpperCase();
}
