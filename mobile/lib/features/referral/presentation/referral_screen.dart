import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/utils/format.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../../core/constants.dart';
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

  String _link(String userId) => '$kSiteUrl/r/$userId';

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
    return BlocBuilder<ReferralCubit, ReferralState>(
      builder: (context, state) {
        final referred = state.data?.referredUsers ?? const <ReferredUserModel>[];
        final loading = state.status == ReferralStatus.loading && referred.isEmpty;
        return WebPage(
          background: false,
          onRefresh: () => context.read<ReferralCubit>().load(),
          gap: 16,
          children: [
            const WebPageTitle(
              'Referal',
              size: 20,
              subtitle: "Do'stlaringizni taklif qiling — har bir ro'yxatdan o'tgan uchun 1 ⭐ olasiz.",
            ),
            if (user != null) _linkCard(_link(user.id)),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Siz taklif qilganlar (${referred.length})',
                    style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                if (loading)
                  const SBlock(height: 64)
                else if (referred.isEmpty)
                  WebCard(
                    child: Text("Hozircha hech kim havolangiz orqali ro'yxatdan o'tmagan.",
                        style: TextStyle(color: WebC.zinc500, fontSize: 14, height: 1.45)),
                  )
                else
                  for (final r in referred)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: WebCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Text.rich(
                                TextSpan(children: [
                                  TextSpan(text: '${r.name ?? '—'} '),
                                  TextSpan(text: '@${r.login ?? '—'}', style: TextStyle(color: WebC.zinc500)),
                                ]),
                                style: TextStyle(color: WebC.zinc200, fontSize: 14),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(shortDateTime(r.createdAt), style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                            const SizedBox(width: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(99),
                              ),
                              child: Text('+1 ⭐',
                                  style: TextStyle(color: WebC.amber, fontSize: 12, fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _linkCard(String link) {
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text("🎁 Do'stlaringizni taklif qiling",
              style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text.rich(
            TextSpan(children: [
              const TextSpan(text: "Havolangiz orqali ro'yxatdan o'tgan har bir yangi foydalanuvchi uchun sizga "),
              TextSpan(text: '1 ⭐', style: TextStyle(color: WebC.amber, fontWeight: FontWeight.w700)),
              const TextSpan(text: ' beriladi.'),
            ]),
            style: TextStyle(color: WebC.zinc500, fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _copy(link),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: WebC.fill5,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: WebC.border),
                    ),
                    child: Text(link,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: WebC.zinc300, fontSize: 12, fontFamily: 'monospace')),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              WebButton(
                label: _copied ? 'Nusxalandi ✓' : 'Nusxalash',
                variant: WebBtn.ghost,
                onPressed: () => _copy(link),
              ),
            ],
          ),
          const SizedBox(height: 8),
          WebButton(
            label: 'Ulashish',
            variant: WebBtn.ghost,
            expand: true,
            icon: Icon(Icons.ios_share_rounded, size: 16, color: WebC.zinc300),
            onPressed: () => Share.share(_shareText(link)),
          ),
        ],
      ),
    );
  }
}
