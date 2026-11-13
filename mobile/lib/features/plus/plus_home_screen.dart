import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/navigation/services.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/app_header_sliver.dart';
import '../../widgets/web_ui.dart';
import '../auth/bloc/auth_bloc.dart';
import '../family/family_entry.dart';
import '../family/family_repository.dart';
import '../home/section_cubit.dart';

/// tayyorr+ bosh sahifasi — xizmatlar (Tayyorr.uz, Tayyorr SMM). Hamyon, yordam, qo'llanma, profil — pastki panelda.
/// Saytdagi plus.tayyorr.uz bosh sahifasining ilovadagi (native) ko'rinishi.
class PlusHomeScreen extends StatefulWidget {
  const PlusHomeScreen({super.key});

  @override
  State<PlusHomeScreen> createState() => _PlusHomeScreenState();
}

class _PlusHomeScreenState extends State<PlusHomeScreen>
    with WidgetsBindingObserver {
  int? _smmServices;
  int _smmOrders = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // ilovaga qaytganda — «Tayyorr's Family» o'qilmaganlari
    if (state == AppLifecycleState.resumed) FamilySummary.instance.refresh();
  }

  Future<void> _load() async {
    context.read<AuthBloc>().add(const AuthMeRefreshRequested());
    FamilySummary.instance.refresh(force: true);
    try {
      final r = await ApiClient.instance.get('/mobile/hub');
      if (!mounted) return;
      setState(() {
        _smmServices = (r['smmServices'] as num?)?.toInt();
        _smmOrders = (r['smmOrders'] as num?)?.toInt() ?? 0;
      });
    } catch (_) {
      /* jim — kartochkalar raqamsiz ham ishlaydi */
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;
    final first = (user?.firstName ?? '').trim().isNotEmpty
        ? user!.firstName!.trim()
        : (user?.displayName ?? '');
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.indigo,
        edgeOffset: 80,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            const AppHeaderSliver(),
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                12,
                20,
                12,
                36 + MediaQuery.paddingOf(context).bottom,
              ),
              sliver: SliverList.list(
                children: [
                  Text(
                    first.isEmpty ? 'Xuş kelibsiz!' : 'Salom, $first!',
                    style: TextStyle(
                      color: WebC.zinc500,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text.rich(
                    const TextSpan(
                      text: 'tayyorr',
                      children: [
                        TextSpan(
                          text: '+',
                          style: TextStyle(color: Color(0xFFD946EF)),
                        ),
                        TextSpan(text: ' xizmatlari'),
                      ],
                    ),
                    style: GoogleFonts.spaceGrotesk(
                      color: WebC.white,
                      fontSize: 30,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.8,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Bitta hisob va bitta hamyon bilan barça xizmatlar. Kerakligini tanlang.',
                    style: TextStyle(
                      color: WebC.zinc400,
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 20),
                  const FamilyHubCard(),
                  _UzCard(
                    roleLabel: user == null
                        ? null
                        : (user.role == null
                              ? 'Rol tanlanmagan'
                              : user.roleLabel),
                  ),
                  const SizedBox(height: 14),
                  _SmmCard(services: _smmServices, orders: _smmOrders),
                  const SizedBox(height: 14),
                  const _SoonCard(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Xizmat kartochkasi (umumiy ko'rinish).
class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.mark,
    required this.title,
    required this.desc,
    required this.glow,
    required this.onTap,
    this.badge,
  });
  final String mark;
  final Widget title;
  final String desc;
  final Color glow;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    // ixçam: belgi | nom (+ belgi-yorliq) va 2 qatorli izoh | strelka — teglar va logolar yöq
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WebC.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: WebC.cardBorder),
          boxShadow: [
            BoxShadow(
              color: glow.withValues(alpha: AppColors.isLight ? 0.10 : 0.16),
              blurRadius: 24,
              offset: const Offset(0, 10),
              spreadRadius: -12,
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
              ),
              child: Image.asset(mark, filterQuality: FilterQuality.high),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: title,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: glow.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            badge!,
                            maxLines: 1,
                            style: TextStyle(
                              color: glow,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    desc,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: WebC.zinc400,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    glow,
                    Color.lerp(glow, const Color(0xFF3B82F6), 0.5)!,
                  ],
                ),
              ),
              child: const Center(
                child: TIcon(
                  TI.arrow_forward_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

TextStyle _titleStyle() => GoogleFonts.spaceGrotesk(
  color: WebC.white,
  fontSize: 18,
  fontWeight: FontWeight.w700,
  letterSpacing: -0.3,
);

class _UzCard extends StatelessWidget {
  const _UzCard({this.roleLabel});
  final String? roleLabel;

  @override
  Widget build(BuildContext context) {
    return _ServiceCard(
      mark: 'assets/logo-mark.png',
      title: Text.rich(
        const TextSpan(
          text: 'Tayyorr',
          children: [
            TextSpan(
              text: '.uz',
              style: TextStyle(color: Color(0xFF818CF8)),
            ),
          ],
        ),
        style: _titleStyle(),
      ),
      desc:
          'Prezentatsiya, kurs işi, referat va diplom işini işonçli tayyorlovçilarga buyurtma qiling.',
      glow: const Color(0xFF6366F1),
      badge: roleLabel,
      onTap: () => openUzSection(AppSection.dashboard),
    );
  }
}

class _SmmCard extends StatelessWidget {
  const _SmmCard({this.services, this.orders = 0});
  final int? services;
  final int orders;

  @override
  Widget build(BuildContext context) {
    return _ServiceCard(
      mark: 'assets/smm-mark.png',
      title: Text.rich(
        const TextSpan(
          text: 'Tayyorr ',
          children: [
            TextSpan(
              text: 'SMM',
              style: TextStyle(color: Color(0xFFD946EF)),
            ),
          ],
        ),
        style: _titleStyle(),
      ),
      desc:
          'Obunaçilar, layklar va körişlar — bir neça daqiqada, avtomatik. Bajarilmasa pul qaytadi.',
      glow: const Color(0xFFD946EF),
      
      onTap: () => openSmm(orders > 0 ? null : 0),
    );
  }
}

class _SoonCard extends StatelessWidget {
  const _SoonCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: WebC.border, width: 1.4),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: WebC.fill5,
              borderRadius: BorderRadius.circular(14),
            ),
            child: TIcon(
              TI.auto_awesome_rounded,
              color: WebC.zinc400,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Yangi xizmatlar tez orada',
                  style: TextStyle(
                    color: WebC.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'tayyorr+ doimiy kengayib boradi — kuzatib boring.',
                  style: TextStyle(
                    color: WebC.zinc500,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
