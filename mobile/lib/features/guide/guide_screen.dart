import '../../core/navigation/services.dart';
import '../../core/navigation/support.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/navigation/open_internal.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../widgets/skeleton.dart';
import '../../widgets/mascot.dart';
import '../../widgets/web_page.dart';
import '../../widgets/web_ui.dart';
import '../auth/bloc/auth_bloc.dart';
import '../messages/data/message_model.dart';
import '../messages/presentation/chat_media.dart';

/// "Qo'llanma" — saytdagi /guide: har rol uchun qadamma-qadam yo'riqnoma
/// (matn serverdan, saytdagi bilan bir xil) va admin yuklagan videolar.
class GuideScreen extends StatefulWidget {
  const GuideScreen({super.key});

  @override
  State<GuideScreen> createState() => _GuideScreenState();
}

class _GuideStep {
  final String icon;
  final String title;
  final List<String> points;
  final String? linkHref;
  final String? linkLabel;
  _GuideStep(this.icon, this.title, this.points, this.linkHref, this.linkLabel);
}

class _GuideVideo {
  final String id;
  final String title;
  final String url;
  _GuideVideo(this.id, this.title, this.url);
}

class _GuideScreenState extends State<GuideScreen> {
  String? _role;
  bool _loading = true;
  String? _error;
  List<_GuideStep> _steps = const [];
  List<_GuideVideo> _videos = const [];
  final _videosKey = GlobalKey();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _role = (context.read<AuthBloc>().state.user?.isPreparer ?? false)
        ? 'PREPARER'
        : 'ORDERER';
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await ApiClient.instance.get(
        '/mobile/guide',
        query: {'role': _role},
      );
      final steps = (r['steps'] as List? ?? const [])
          .cast<Map<String, dynamic>>()
          .map((s) {
            final link = s['link'] as Map<String, dynamic>?;
            return _GuideStep(
              s['icon'] as String? ?? '',
              s['title'] as String? ?? '',
              (s['points'] as List? ?? const []).map((e) => '$e').toList(),
              link?['href'] as String?,
              link?['label'] as String?,
            );
          })
          .toList();
      final videos = (r['videos'] as List? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(
            (v) =>
                _GuideVideo('${v['id']}', '${v['title'] ?? ''}', '${v['url']}'),
          )
          .toList();
      if (!mounted) return;
      setState(() {
        _steps = steps;
        _videos = videos;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = friendlyError(e);
        _loading = false;
      });
    }
  }

  void _setRole(String r) {
    if (r == _role) return;
    setState(() => _role = r);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return WebPage(
      controller: _scroll,
      background: ShellRootScope.of(context) == null,
      onRefresh: _load,
      children: [
        const SizedBox(height: 8),
        const WebPageTitle(
          "Qöllanma",
          subtitle: "Tayyorrʼda qanday işlaş — qadamma-qadam, oddiy tilda.",
        ),
        const SizedBox(height: 16),
        // video bo'lsagina — "Video bilan tushunish osonroq" bloki
        if (!_loading && _videos.isNotEmpty) ...[
          _hero(),
          const SizedBox(height: 16),
        ],
        Row(
          children: [
            Expanded(
              child: _roleTab(
                'ORDERER',
                'Buyurtma beruvçi',
                TI.inventory_2_outlined,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _roleTab(
                'PREPARER',
                'Tayyorlovçi',
                TI.auto_awesome_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (_loading) ...[
          for (var i = 0; i < 4; i++) _stepSkeleton(last: i == 3),
        ] else if (_error != null)
          ErrorState.from(_error, _load)
        else ...[
          for (var i = 0; i < _steps.length; i++)
            _stepTile(i, _steps[i], last: i == _steps.length - 1),
          const SizedBox(height: 12),
          _helpCard(),
          if (_videos.isNotEmpty) ...[
            const SizedBox(height: 28),
            Container(
              key: _videosKey,
              child: Text(
                'Video qöllanmalar',
                style: TextStyle(
                  color: WebC.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 12),
            for (final v in _videos) ...[
              _videoCard(v),
              const SizedBox(height: 12),
            ],
          ],
        ],
      ],
    );
  }

  Widget _hero() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withValues(alpha: 0.35),
            blurRadius: 30,
            offset: const Offset(0, 14),
            spreadRadius: -10,
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const TIcon(
              TI.play_circle_fill_rounded,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Video bilan tuşuniş osonroq',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _videos.isEmpty
                      ? 'Videolar tez orada qöşiladi'
                      : '${_videos.length} ta video qöllanma pastda',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          if (_videos.isNotEmpty)
            GestureDetector(
              onTap: () {
                // ro'yxat dangasa quriladi (pastdagi videolar hali chizilmagan) — scroll'ni eng pastga suramiz
                if (_scroll.hasClients) {
                  _scroll.animateTo(
                    _scroll.position.maxScrollExtent,
                    duration: const Duration(milliseconds: 650),
                    curve: Curves.easeOutCubic,
                  );
                  Future.delayed(const Duration(milliseconds: 700), () {
                    if (_scroll.hasClients) {
                      _scroll.animateTo(
                        _scroll.position.maxScrollExtent,
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOut,
                      );
                    }
                  });
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  "Köriş ↓",
                  style: TextStyle(
                    color: Color(0xFF4F46E5),
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _roleTab(String id, String label, TIData icon) {
    final on = _role == id;
    return GestureDetector(
      onTap: () => _setRole(id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: on ? WebC.indigoFill : WebC.fill5,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: on ? const Color(0xFF818CF8) : WebC.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TIcon(icon, size: 16, color: on ? WebC.white : WebC.zinc400),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: on ? WebC.white : WebC.zinc400,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _stepTile(int i, _GuideStep s, {required bool last}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
                    ),
                  ),
                  child: TIcon(_icon(s.icon), color: Colors.white, size: 19),
                ),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            const Color(0xFF818CF8).withValues(alpha: 0.6),
                            const Color(0xFF818CF8).withValues(alpha: 0.1),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: last ? 0 : 16),
              child: WebCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${i + 1}-QADAM',
                      style: const TextStyle(
                        color: Color(0xFF818CF8),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      s.title,
                      style: TextStyle(
                        color: WebC.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    for (final p in s.points)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(top: 7, right: 8),
                              child: Container(
                                width: 5,
                                height: 5,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFA78BFA),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                p,
                                style: TextStyle(
                                  color: WebC.zinc300,
                                  fontSize: 13.5,
                                  height: 1.45,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (s.linkHref != null && s.linkLabel != null) ...[
                      const SizedBox(height: 6),
                      WebButton(
                        label: '${s.linkLabel} ›',
                        variant: WebBtn.ghost,
                        small: true,
                        onPressed: () => openInternalUrl(context, s.linkHref!),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Qadam kartasining skeleti — haqiqiy [_stepTile] bilan bir xil joylashuv.
  Widget _stepSkeleton({required bool last}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 40,
            child: Column(
              children: [
                const SCircle(size: 40),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: WebC.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: last ? 0 : 16),
              child: WebCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    SBar(width: 56, height: 10),
                    SizedBox(height: 8),
                    SBar(width: 170, height: 16),
                    SizedBox(height: 12),
                    SBar(height: 12),
                    SizedBox(height: 8),
                    SBar(width: 210, height: 12),
                    SizedBox(height: 8),
                    SBar(width: 150, height: 12),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _helpCard() {
    return WebCard(
      child: Row(
        children: [
          TIcon(TI.support_agent_rounded, color: WebC.indigoSoft, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Savolingiz bormi?',
                  style: TextStyle(
                    color: WebC.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "«Xabarlar» bölimida qöllab-quvvatlaş xizmatiga yozing.",
                  style: TextStyle(
                    color: WebC.zinc400,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          WebButton(
            label: 'Yoziş',
            small: true,
            onPressed: () => openSupportChat(context),
          ),
        ],
      ),
    );
  }

  Widget _videoCard(_GuideVideo v) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => VideoPlayerScreen(
            file: ChatFileModel(
              name: '${v.title}.mp4',
              type: 'video/mp4',
              size: 0,
              url: v.url,
            ),
            cacheKey: 'guide-${v.id}',
          ),
        ),
      ),
      child: Container(
        height: 190,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF3D2C95), Color(0xFF211868), Color(0xFF110D3C)],
          ),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Stack(
          children: [
            Positioned(
              right: -30,
              top: -40,
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                ),
              ),
            ),
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.3),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TIcon(TI.play_arrow_rounded, color: Colors.white, size: 22),
                    SizedBox(width: 4),
                    Text(
                      "Köriş",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 14,
              child: Text(
                v.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Saytdagi ikonka nomlari → Material ikonkalar.
  TIData _icon(String name) {
    switch (name) {
      case 'package':
        return TI.inventory_2_outlined;
      case 'banknote':
        return TI.payments_outlined;
      case 'check':
        return TI.check_rounded;
      case 'check-circle':
        return TI.check_circle_outline_rounded;
      case 'clock':
        return TI.schedule_rounded;
      case 'coins':
        return TI.monetization_on_outlined;
      case 'file':
        return TI.description_outlined;
      case 'hand':
        return TI.back_hand_outlined;
      case 'lifebuoy':
        return TI.support_rounded;
      case 'message':
        return TI.chat_bubble_outline_rounded;
      case 'scale':
        return TI.balance_rounded;
      case 'search':
        return TI.search_rounded;
      case 'send':
        return TI.send_rounded;
      case 'star':
        return TI.star_rounded;
      case 'user':
        return TI.person_outline_rounded;
      case 'users':
        return TI.group_outlined;
      case 'wallet':
        return TI.account_balance_wallet_outlined;
      default:
        return TI.circle_outlined;
    }
  }
}
