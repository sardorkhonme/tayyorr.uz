import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/app_header_sliver.dart';
import '../../widgets/web_ui.dart';
import '../home/section_cubit.dart';

class Announcement {
  Announcement(this.id, this.title, this.body, this.buttonText, this.buttonUrl);
  final String id;
  final String title;
  final String body;
  final String? buttonText;
  final String? buttonUrl;

  static Future<List<Announcement>> fetch() async {
    final res = await ApiClient.instance.get('/mobile/announcements');
    return (res['announcements'] as List)
        .cast<Map<String, dynamic>>()
        .map(
          (j) => Announcement(
            j['id'] as String,
            j['title'] as String? ?? '',
            j['body'] as String? ?? '',
            j['buttonText'] as String?,
            j['buttonUrl'] as String?,
          ),
        )
        .toList();
  }
}

// Saytdagi readMs: har belgiga ~55ms + zaxira, [4s..18s]
Duration _readTime(Announcement a) {
  final chars = '${a.title} ${a.body} ${a.buttonText ?? ''}'.replaceAll(RegExp(r'\s'), '').length;
  return Duration(milliseconds: (2500 + chars * 55 + 1500).clamp(4000, 18000));
}

// Ilova ichida mos bo'limi bor sayt sahifalari
const _internal = {
  '/dashboard': AppSection.dashboard,
  '/offers': AppSection.offers,
  '/referral': AppSection.referral,
  '/messages': AppSection.messages,
  '/wallet': AppSection.wallet,
  '/profile': AppSection.profile,
};

/// Saytdagi AnnouncementCarousel: navbatlashib turuvchi e'lon kartasi.
class AnnouncementCarousel extends StatefulWidget {
  const AnnouncementCarousel({super.key, required this.items});
  final List<Announcement> items;

  @override
  State<AnnouncementCarousel> createState() => _AnnouncementCarouselState();
}

class _AnnouncementCarouselState extends State<AnnouncementCarousel> with SingleTickerProviderStateMixin {
  int _i = 0;
  late final AnimationController _progress;

  @override
  void initState() {
    super.initState();
    _progress = AnimationController(vsync: this)
      ..addStatusListener((s) {
        if (s == AnimationStatus.completed) _go(_i + 1);
      });
    _start();
  }

  void _start() {
    if (widget.items.length < 2) return;
    _progress
      ..duration = _readTime(widget.items[_i])
      ..forward(from: 0);
  }

  int _dir = 1; // animatsiya yo'nalishi: 1 — keyingi, -1 — oldingi

  void _go(int to) {
    final n = widget.items.length;
    setState(() {
      _dir = to >= _i ? 1 : -1;
      _i = (to + n) % n;
    });
    _start();
  }

  @override
  void dispose() {
    _progress.dispose();
    super.dispose();
  }

  Future<void> _open(Announcement a) async {
    unawaited(ApiClient.instance.post('/mobile/announcements/${a.id}/click').catchError((_) => <String, dynamic>{}));
    final url = a.buttonUrl ?? '';
    final section = _internal[url];
    if (section != null) {
      goToSection(context, section);
      return;
    }
    final full = url.startsWith('http') ? url : '$kSiteUrl${url.startsWith('/') ? '' : '/'}$url';
    await launchUrl(Uri.parse(full), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final a = widget.items[_i];
    final many = widget.items.length > 1;
    final hasBtn = (a.buttonText ?? '').isNotEmpty && (a.buttonUrl ?? '').isNotEmpty;
    final navColor = light ? const Color(0xFF312E81).withValues(alpha: 0.6) : Colors.white.withValues(alpha: 0.65);

    // Balandlik matnga moslashadi (qirqilmaydi); chap/o'ngga surish — almashtiradi.
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragEnd: !many
          ? null
          : (d) {
              final v = d.primaryVelocity ?? 0;
              if (v < -150) _go(_i + 1);
              if (v > 150) _go(_i - 1);
            },
      child: Container(
        constraints: const BoxConstraints(minHeight: 152),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.25)),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [const Color(0xFF6366F1).withValues(alpha: 0.15), const Color(0xFFD946EF).withValues(alpha: 0.10)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AnimatedSize(
              duration: const Duration(milliseconds: 320),
              curve: Curves.easeOutCubic,
              alignment: Alignment.topCenter,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 380),
                layoutBuilder: (current, previous) =>
                    Stack(alignment: Alignment.topCenter, children: [...previous, if (current != null) current]),
                transitionBuilder: (child, anim) {
                  final incoming = child.key == ValueKey(a.id);
                  final from = Offset(0.18 * _dir * (incoming ? 1 : -1), 0);
                  return FadeTransition(
                    opacity: anim,
                    child: SlideTransition(
                      position: Tween(
                        begin: from,
                        end: Offset.zero,
                      ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
                      child: child,
                    ),
                  );
                },
                child: Column(
                  key: ValueKey(a.id),
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      a.title,
                      style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    if (a.body.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(a.body, style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.375)),
                    ],
                    if (hasBtn) ...[
                      const SizedBox(height: 12),
                      WebButton(label: a.buttonText!, variant: WebBtn.white, expand: true, onPressed: () => _open(a)),
                    ],
                  ],
                ),
              ),
            ),
            if (many) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => _go(_i - 1),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(2, 8, 12, 8),
                      child: Text('‹', style: TextStyle(color: navColor, fontSize: 20, height: 1)),
                    ),
                  ),
                  for (var k = 0; k < widget.items.length; k++) ...[
                    GestureDetector(
                      onTap: () => _go(k),
                      child: Container(
                        width: 16,
                        height: 2,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(2),
                          color: k < _i
                              ? (light
                                    ? const Color(0xFF312E81).withValues(alpha: 0.55)
                                    : Colors.white.withValues(alpha: 0.6))
                              : (light
                                    ? const Color(0xFF312E81).withValues(alpha: 0.25)
                                    : Colors.white.withValues(alpha: 0.28)),
                        ),
                        child: k == _i
                            ? AnimatedBuilder(
                                animation: _progress,
                                builder: (_, __) => FractionallySizedBox(
                                  alignment: Alignment.centerLeft,
                                  widthFactor: _progress.value,
                                  child: Container(color: light ? const Color(0xFF4338CA) : Colors.white),
                                ),
                              )
                            : null,
                      ),
                    ),
                    const SizedBox(width: 4),
                  ],
                  const SizedBox(width: 4),
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => _go(_i + 1),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                      child: Text('›', style: TextStyle(color: navColor, fontSize: 20, height: 1)),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
