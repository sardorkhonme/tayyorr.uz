import '../core/navigation/open_internal.dart';
import '../core/ui/app_dialogs.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

final _urlRe = RegExp(
  r'((?:https?:\/\/|www\.)[^\s<>"]+|\btayyorr\.uz\/[^\s<>"]*)',
  caseSensitive: false,
);

/// Havolani ochadi: tayyorr.uz (va barcha *.tayyorr.uz) sahifalari — ilovaning o'zida,
/// boshqa saytlar — ilova ichidagi brauzer oynasida (ilovadan chiqmasdan).
Future<void> openLink(BuildContext context, String raw) async {
  var url = raw;
  if (!url.toLowerCase().startsWith('http')) url = 'https://$url';
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  final host = uri.host.toLowerCase();
  if (host == 'tayyorr.uz' || host.endsWith('.tayyorr.uz'))
    return openInternalUrl(context, url);
  final ok = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
  if (!ok) await launchUrl(uri, mode: LaunchMode.externalApplication);
}

/// Matndagi havolalarni ajratib, bosiladigan qilib ko'rsatadi.
/// Havolani uzoq bosish — nusxa oladi.
class LinkText extends StatefulWidget {
  const LinkText(
    this.text, {
    super.key,
    required this.style,
    required this.linkColor,
  });
  final String text;
  final TextStyle style;
  final Color linkColor;

  @override
  State<LinkText> createState() => _LinkTextState();
}

class _LinkTextState extends State<LinkText> {
  final _recognizers = <GestureRecognizer>[];

  void _disposeRecognizers() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _disposeRecognizers();
    final text = widget.text;
    final spans = <InlineSpan>[];
    var last = 0;
    for (final m in _urlRe.allMatches(text)) {
      var link = m.group(0)!;
      // oxiridagi tinish belgilari havolaga kirmasin
      final trail = RegExp(r'[.,!?;:)»"]+$').firstMatch(link);
      final end = m.end - (trail?.group(0)?.length ?? 0);
      link = text.substring(m.start, end);
      if (m.start > last)
        spans.add(TextSpan(text: text.substring(last, m.start)));
      final r = TapGestureRecognizer()..onTap = () => openLink(context, link);
      _recognizers.add(r);
      spans.add(
        TextSpan(
          text: link,
          recognizer: r,
          style: TextStyle(
            color: widget.linkColor,
            decoration: TextDecoration.underline,
            decorationColor: widget.linkColor.withValues(alpha: 0.6),
          ),
        ),
      );
      last = end;
    }
    if (last < text.length) spans.add(TextSpan(text: text.substring(last)));
    if (_recognizers.isEmpty) return Text(text, style: widget.style);
    return GestureDetector(
      onLongPress: () {
        final first = _urlRe.firstMatch(text)?.group(0);
        if (first == null) return;
        Clipboard.setData(ClipboardData(text: first));
        showToast(context, 'Havola nusxalandi', kind: ToastKind.success);
      },
      child: Text.rich(TextSpan(children: spans), style: widget.style),
    );
  }
}
