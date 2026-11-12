import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Reaksiya belgisi — barça çatlarda (Family, Support, 1:1) va reaksiya tanlaş panelida bir xil.
/// Ilova şriftida U+2764 (❤) oddiy bir rangli belgi bölgani uçun yurak — qizil SVG
/// (standart emoji körinişida: qizil töldiriş va yengil yaltiraş). Boşqa emojilar — tizimning
/// rangli emoji şrifti bilan (ilova şrifti çetlab ötiladi).
class ReactionEmoji extends StatelessWidget {
  const ReactionEmoji(this.emoji, {super.key, this.size = 18});

  final String emoji;
  final double size;

  static bool isHeart(String e) {
    final t = e.replaceAll('️', '').replaceAll('︎', '').trim();
    return t == '❤' || t == '♥' || t == '💖';
  }

  /// Rangli emoji uçun matn uslubi (ilova şriftida emoji glifi bölsa ham tizimnikini oladi).
  static TextStyle style(double size) => TextStyle(
    fontFamily: '__tayyorr_emoji__',
    fontFamilyFallback: const ['Noto Color Emoji', 'Apple Color Emoji'],
    fontSize: size,
    height: 1.15,
    decoration: TextDecoration.none,
  );

  static const String _heartSvg = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF4D57"/>
      <stop offset="1" stop-color="#E0202C"/>
    </linearGradient>
  </defs>
  <path fill="url(#g)" d="M35.885 11.833c0-5.45-4.418-9.868-9.867-9.868-3.308 0-6.227 1.633-8.018 4.129-1.791-2.496-4.71-4.129-8.017-4.129-5.45 0-9.868 4.417-9.868 9.868 0 .772.098 1.52.266 2.241C1.751 22.587 11.216 31.568 18 34.034c6.783-2.466 16.249-11.447 17.617-19.959.17-.721.268-1.469.268-2.242z"/>
  <ellipse cx="9.6" cy="9.4" rx="4.2" ry="2.6" transform="rotate(-32 9.6 9.4)" fill="#FFFFFF" fill-opacity="0.38"/>
  <circle cx="14.2" cy="6.9" r="1.1" fill="#FFFFFF" fill-opacity="0.32"/>
</svg>''';

  @override
  Widget build(BuildContext context) {
    if (isHeart(emoji)) {
      return SizedBox(
        width: size * 1.1,
        height: size * 1.1,
        child: Center(
          child: SvgPicture.string(
            _heartSvg,
            width: size,
            height: size,
            excludeFromSemantics: true,
          ),
        ),
      );
    }
    return Text(emoji, textScaler: TextScaler.noScaling, style: style(size));
  }
}
