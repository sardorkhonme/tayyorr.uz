import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../widgets/mascot.dart';
import '../../widgets/session_transitions.dart';
import '../../widgets/web_page.dart';
import '../../widgets/web_ui.dart';

/// Ommaviy oferta / maxfiylik siyosati — ilova ichida (saytdagi /terms, /privacy bilan bir xil matn).
class LegalScreen extends StatefulWidget {
  const LegalScreen({super.key, this.privacy = false});
  final bool privacy;

  static void open(BuildContext context, {bool privacy = false}) =>
      Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (_) => LegalScreen(privacy: privacy)));

  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  Map<String, dynamic>? _doc;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await ApiClient.instance.get(
        '/mobile/legal',
        query: {'doc': widget.privacy ? 'privacy' : 'terms'},
      );
      if (mounted) {
        setState(() {
          _doc = r;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = friendlyError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _doc;
    final sections = (d?['sections'] as List? ?? const [])
        .cast<Map<String, dynamic>>();
    return WebPage(
      onRefresh: _load,
      children: [
        if (_error != null && d == null)
          ErrorState.from(_error, () {
            setState(() => _error = null);
            _load();
          })
        else if (d == null)
          const BrandLoaderBlock()
        else ...[
          WebPageTitle('${d['title']}', size: 23),
          const SizedBox(height: 6),
          Text(
            'Yangilangan: ${d['updated'] ?? ''}',
            style: TextStyle(color: WebC.zinc500, fontSize: 13),
          ),
          const SizedBox(height: 16),
          Text(
            '${d['intro'] ?? ''}',
            style: TextStyle(color: WebC.zinc300, fontSize: 14.5, height: 1.55),
          ),
          const SizedBox(height: 18),
          for (final s in sections) ...[
            WebCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${s['title']}',
                    style: TextStyle(
                      color: WebC.white,
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      height: 1.35,
                    ),
                  ),
                  if (s['body'] != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      '${s['body']}',
                      style: TextStyle(
                        color: WebC.zinc300,
                        fontSize: 14,
                        height: 1.55,
                      ),
                    ),
                  ],
                  for (final p in (s['points'] as List? ?? const []))
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
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
                              '$p',
                              style: TextStyle(
                                color: WebC.zinc300,
                                fontSize: 14,
                                height: 1.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],
        ],
      ],
    );
  }
}
