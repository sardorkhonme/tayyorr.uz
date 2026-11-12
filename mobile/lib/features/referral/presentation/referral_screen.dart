import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/utils/format.dart';
import '../../../widgets/mascot.dart';
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

  String _link(String userId) => '$kPublicSiteUrl/r/$userId';

  String _shareText(String link) =>
      "tayyorr.uz — ilmiy işlaringiz (prezentatsiya, kurs işi, referat, diplom) uçun işonçli tayyorlovçi toping yoki özingiz tayyorlab daromad qiling!\n\n"
      "Şu havola orqali röyxatdan öting: $link";

  Future<void> _copy(String link) async {
    await Clipboard.setData(ClipboardData(text: link));
    setState(() => _copied = true);
    Future.delayed(const Duration(milliseconds: 3500), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;
    return BlocBuilder<ReferralCubit, ReferralState>(
      builder: (context, state) {
        final referred =
            state.data?.referredUsers ?? const <ReferredUserModel>[];
        final loading =
            (state.status == ReferralStatus.loading ||
                state.status == ReferralStatus.initial) &&
            referred.isEmpty;
        return WebPage(
          background: false,
          onRefresh: () => context.read<ReferralCubit>().load(),
          gap: 16,
          children: [
            const WebPageTitle(
              'Referal',
              size: 20,
              subtitle:
                  "Döstlaringizni taklif qiling — har bir röyxatdan ötgan uçun 1 star olasiz.",
            ),
            if (user != null) _linkCard(_link(user.id)),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Siz taklif qilganlar (${referred.length})',
                  style: TextStyle(
                    color: WebC.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (loading)
                  for (var i = 0; i < 3; i++)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: WebCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: SBar(width: 170, height: 14),
                              ),
                            ),
                            SizedBox(width: 12),
                            SBar(width: 70, height: 11),
                            SizedBox(width: 12),
                            SBar(width: 38, height: 18, borderRadius: 99),
                          ],
                        ),
                      ),
                    )
                else if (referred.isEmpty &&
                    state.status == ReferralStatus.failure)
                  ErrorState.from(
                    state.error,
                    () => context.read<ReferralCubit>().load(),
                  )
                else if (referred.isEmpty)
                  WebCard(
                    child: Text(
                      "Hozirça heç kim havolangiz orqali röyxatdan ötmagan.",
                      style: TextStyle(
                        color: WebC.zinc500,
                        fontSize: 14,
                        height: 1.45,
                      ),
                    ),
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
                                TextSpan(
                                  children: [
                                    TextSpan(text: '${r.name ?? '—'} '),
                                    TextSpan(
                                      text: '@${r.login ?? '—'}',
                                      style: TextStyle(color: WebC.zinc500),
                                    ),
                                  ],
                                ),
                                style: TextStyle(
                                  color: WebC.zinc200,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              shortDateTime(r.createdAt),
                              style: TextStyle(
                                color: WebC.zinc500,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFFF59E0B,
                                ).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(99),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '+1',
                                    style: TextStyle(
                                      color: WebC.amber,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(width: 2),
                                  const StarGlyph(size: 12),
                                ],
                              ),
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
          IconLabel(
            TI.card_giftcard_rounded,
            "Döstlaringizni taklif qiling",
            color: WebC.indigoSoft,
            size: 18,
            style: TextStyle(
              color: WebC.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text.rich(
            TextSpan(
              children: [
                const TextSpan(
                  text:
                      "Havolangiz orqali röyxatdan ötgan har bir yangi foydalanuvçi uçun sizga ",
                ),
                TextSpan(
                  text: '1 ',
                  style: TextStyle(
                    color: WebC.amber,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                starSpan(size: 12),
                const TextSpan(text: ' beriladi.'),
              ],
            ),
            style: TextStyle(color: WebC.zinc500, fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _copy(link),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: WebC.fill5,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: WebC.border),
                    ),
                    child: Text(
                      link,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: WebC.zinc300,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              WebButton(
                label: _copied ? 'Nusxalandi' : 'Nusxalaş',
                leading: _copied ? TI.check_rounded : null,
                variant: WebBtn.ghost,
                onPressed: () => _copy(link),
              ),
            ],
          ),
          const SizedBox(height: 8),
          WebButton(
            label: 'Ulaşiş',
            variant: WebBtn.ghost,
            expand: true,
            icon: TIcon(TI.ios_share_rounded, size: 16, color: WebC.zinc300),
            onPressed: () => Share.share(_shareText(link)),
          ),
        ],
      ),
    );
  }
}
