import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/skeleton.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../cubit/referral_cubit.dart';
import '../data/referral_model.dart';
import '../data/referral_repository.dart';

class ReferralScreen extends StatelessWidget {
  const ReferralScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ReferralCubit(ReferralRepository())..load(),
      child: const _ReferralView(),
    );
  }
}

class _ReferralView extends StatefulWidget {
  const _ReferralView();

  @override
  State<_ReferralView> createState() => _ReferralViewState();
}

class _ReferralViewState extends State<_ReferralView> {
  bool _copied = false;

  String _link(String userId) => 'https://tayyorr.uz/r/$userId';

  String _shareText(String link) =>
      "tayyorr.uz — ilmiy ishlaringiz (prezentatsiya, kurs ishi, referat, diplom) uchun ishonchli tayyorlovchi toping yoki o'zingiz tayyorlab daromad qiling!\n\n"
      "Shu havola orqali ro'yxatdan o'ting: $link";

  Future<void> _copy(String link) async {
    await Clipboard.setData(ClipboardData(text: link));
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: () => context.read<ReferralCubit>().load(),
        color: AppColors.indigo,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          slivers: [
            const AppHeaderSliver(),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Text("Do'stlaringizni taklif qiling",
                      style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  const Text(
                    "Havolangiz orqali ro'yxatdan o'tgan har bir yangi foydalanuvchi uchun sizga 1 ⭐ beriladi.",
                    style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  if (user != null) ...[
                    GlassCard(
                      blur: false,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.tint(0.05),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.cardBorder),
                            ),
                            child: Text(
                              _link(user.id),
                              style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _copy(_link(user.id)),
                                  icon: Icon(_copied ? Icons.check_rounded : Icons.copy_rounded, size: 16),
                                  label: Text(_copied ? 'Nusxalandi' : 'Nusxalash'),
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(color: AppColors.cardBorder),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () => Share.share(_shareText(_link(user.id))),
                                  icon: const Icon(Icons.ios_share_rounded, size: 16),
                                  label: const Text('Ulashish'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.indigo,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 22),
                  BlocBuilder<ReferralCubit, ReferralState>(
                    builder: (context, state) {
                      final referred = state.data?.referredUsers ?? const <ReferredUserModel>[];
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Siz taklif qilganlar (${referred.length})',
                              style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 10),
                          if (state.status == ReferralStatus.loading && referred.isEmpty)
                            const Column(
                              children: [
                                SRow(withAvatar: false),
                                SizedBox(height: 10),
                                SRow(withAvatar: false),
                              ],
                            )
                          else if (referred.isEmpty)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Text(
                                "Hozircha hech kim havolangiz orqali ro'yxatdan o'tmagan.",
                                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                              ),
                            )
                          else
                            ...referred.map((r) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: GlassCard(
                                    blur: false,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '${r.name ?? "—"} @${r.login ?? "—"}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(color: AppColors.textPrimary, fontSize: 13),
                                          ),
                                        ),
                                        Text(timeAgo(r.createdAt),
                                            style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.amber.withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(99),
                                          ),
                                          child: const Text('+1 ⭐',
                                              style: TextStyle(color: AppColors.amber, fontSize: 11, fontWeight: FontWeight.w700)),
                                        ),
                                      ],
                                    ),
                                  ),
                                )),
                        ],
                      );
                    },
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
