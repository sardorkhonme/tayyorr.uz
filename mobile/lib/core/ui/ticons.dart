// ignore_for_file: constant_identifier_names
import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Tayyorr ilovasining o'z ikonkalar to'plami (Material ikonkalari o'rniga).
/// Hammasi bir uslubda: 24×24, 1.8 qalinlikdagi yumaloq chiziq; "faol" holatlar — yarim shaffof
/// to'ldirilgan (duotone) yoki to'liq to'ldirilgan variant.
class TIData {
  const TIData(this.body, {this.fill = false, this.duo = false});

  /// SVG ichki elementlari (path, circle, rect)
  final String body;

  /// To'liq to'ldirilgan (yulduz, play)
  final bool fill;

  /// Yarim shaffof to'ldirilgan + chiziq (tanlangan holat)
  final bool duo;

  TIData get duotone => TIData(body, duo: true);
}

/// Icon o'rniga: TIcon(TI.home, size: 20, color: …)
class TIcon extends StatelessWidget {
  const TIcon(this.icon, {super.key, this.size, this.color});
  final TIData? icon;
  final double? size;
  final Color? color;

  static final _cache = <String, String>{};

  @override
  Widget build(BuildContext context) {
    final t = IconTheme.of(context);
    final s = size ?? t.size ?? 24;
    final c = color ?? t.color ?? const Color(0xFF71717A);
    final i = icon;
    if (i == null) return SizedBox(width: s, height: s);
    final key = '${i.fill}|${i.duo}|${i.body}';
    final svg = _cache[key] ??= '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
        'fill="${i.fill ? '#000' : (i.duo ? '#000' : 'none')}" '
        '${i.duo ? 'fill-opacity="0.22" ' : ''}'
        'stroke="#000" stroke-width="${i.fill ? 1.2 : 1.8}" stroke-linecap="round" stroke-linejoin="round">'
        '${i.body}</svg>';
    return SizedBox(
      width: s,
      height: s,
      child: SvgPicture.string(svg, width: s, height: s, colorFilter: ColorFilter.mode(c, BlendMode.srcIn)),
    );
  }
}

// ---- asosiy shakllar ----
const _home = '<path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 0 1 3.5 19z"/>';
const _chat = '<path d="M5.2 4.5h13.6a1.7 1.7 0 0 1 1.7 1.7v8.6a1.7 1.7 0 0 1-1.7 1.7H10l-4.5 3.4v-3.4h-.3a1.7 1.7 0 0 1-1.7-1.7V6.2a1.7 1.7 0 0 1 1.7-1.7z"/><path d="M8 9.5h8M8 12.5h5" fill="none"/>';
const _wallet = '<rect x="3.5" y="6.5" width="17" height="13" rx="2.6"/><path d="M15.8 11h4.7v4.2h-4.7a2.1 2.1 0 0 1 0-4.2z"/><path d="M6 6.5 15.2 4a1.3 1.3 0 0 1 1.6 1.3v1.2" fill="none"/>';
const _user = '<circle cx="12" cy="8.3" r="3.8"/><path d="M4.6 20c.9-3.5 3.8-5.4 7.4-5.4s6.5 1.9 7.4 5.4z"/>';
const _users = '<circle cx="9" cy="8.6" r="3.2"/><path d="M3 19.5c.6-3 3-4.8 6-4.8s5.4 1.8 6 4.8z"/><path d="M15.6 5.7a3 3 0 0 1 0 5.9M17.7 14.9c1.7.6 2.9 2.2 3.3 4.6" fill="none"/>';
const _hand =
    '<path d="M8.2 12.5V6.4a1.5 1.5 0 0 1 3 0v4.8V4.9a1.5 1.5 0 0 1 3 0v6.3-4.8a1.5 1.5 0 0 1 3 0v7.4c0 4-2.6 6.7-6.1 6.7-2.4 0-4-1.2-5.2-3.3l-2.2-3.8a1.5 1.5 0 0 1 2.5-1.6l2 2.8z"/>';
const _check = '<path d="m5 12.6 4.4 4.4L19 7.4" fill="none"/>';
const _checkCircle = '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.3 2.6 2.6 5-5.2" fill="none"/>';
const _close = '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none"/>';
const _xCircle = '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6m0-5.6-5.6 5.6" fill="none"/>';
const _alert =
    '<path d="M10.7 4.9a1.5 1.5 0 0 1 2.6 0l7.6 13.4a1.5 1.5 0 0 1-1.3 2.2H4.4a1.5 1.5 0 0 1-1.3-2.2z"/><path d="M12 9.8v4.2" fill="none"/><circle cx="12" cy="17" r="1" fill="#000" fill-opacity="1" stroke="none"/>';
const _file =
    '<path d="M6.6 3.5h7.1l4.8 4.8v11.1a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 19.4V5.1a1.6 1.6 0 0 1 1.6-1.6z"/><path d="M13.5 3.6v4.9h4.9M8.5 13h7M8.5 16.5h4.5" fill="none"/>';
const _fileBlank = '<path d="M6.6 3.5h7.1l4.8 4.8v11.1a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 19.4V5.1a1.6 1.6 0 0 1 1.6-1.6z"/><path d="M13.5 3.6v4.9h4.9" fill="none"/>';
const _eye = '<path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>';
const _eyeOff =
    '<path d="m3.5 3.5 17 17M10.4 5.7c.5-.1 1-.1 1.6-.1 6 0 9.5 6.4 9.5 6.4a16.6 16.6 0 0 1-2.7 3.5M6.7 6.8C4 8.5 2.5 12 2.5 12S6 18.4 12 18.4c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none"/>';
const _trash =
    '<path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7" fill="none"/><path d="m6.5 7 .8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12z"/><path d="M10 11v5.5M14 11v5.5" fill="none"/>';
const _wifiOff =
    '<path d="m3 3 18 18M8.6 16.4a4.9 4.9 0 0 1 6.8 0M5 12.6a10 10 0 0 1 4.3-2.4M14.7 10.2A10 10 0 0 1 19 12.6M2 9a15 15 0 0 1 4.1-2.7M10.4 5.6A15 15 0 0 1 22 9" fill="none"/><circle cx="12" cy="19.6" r="1.1" fill="#000" fill-opacity="1" stroke="none"/>';
const _headset =
    '<path d="M4.5 13.5v-1.7a7.5 7.5 0 0 1 15 0v1.7" fill="none"/><rect x="3.5" y="13" width="4.2" height="6.2" rx="1.6"/><rect x="16.3" y="13" width="4.2" height="6.2" rx="1.6"/><path d="M20.5 18.5v.4a2.8 2.8 0 0 1-2.8 2.8h-4.4" fill="none"/>';
const _star = '<path d="m12 3.9 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>';
const _play = '<path d="M8.3 5.4c0-.9 1-1.4 1.7-.9l9 6.6c.6.4.6 1.4 0 1.8l-9 6.6c-.7.5-1.7 0-1.7-.9z"/>';
const _playCircle = '<circle cx="12" cy="12" r="9"/><path d="M10.2 8.6c0-.6.6-.9 1.1-.6l4.6 3.4c.4.3.4.9 0 1.2l-4.6 3.4c-.5.3-1.1 0-1.1-.6z" fill="#000" fill-opacity="1"/>';
const _book =
    '<path d="M3.8 5.6c2.6-1.4 5.6-1.4 8.2 0v13.8c-2.6-1.4-5.6-1.4-8.2 0zM12 5.6c2.6-1.4 5.6-1.4 8.2 0v13.8c-2.6-1.4-5.6-1.4-8.2 0z"/>';
const _package =
    '<path d="m12 3.5 8 4.2v8.6L12 20.5l-8-4.2V7.7z"/><path d="m4.2 7.8 7.8 4.2 7.8-4.2M12 12v8.4M8 5.6l8 4.3" fill="none"/>';
const _scale =
    '<path d="M12 4v16M7.5 20h9M5 7.3h14M12 4.5v2.8" fill="none"/><path d="m5 7.3-2.6 6.1a2.9 2.9 0 0 0 5.2 0zM19 7.3l-2.6 6.1a2.9 2.9 0 0 0 5.2 0z"/>';
const _tag =
    '<path d="M3.6 12.2V5.1a1.5 1.5 0 0 1 1.5-1.5h7.1l8.3 8.3a1.6 1.6 0 0 1 0 2.2l-6.6 6.6a1.6 1.6 0 0 1-2.2 0z"/><circle cx="8.2" cy="8.2" r="1.3" fill="#000" fill-opacity="1" stroke="none"/>';
const _chevronRight = '<path d="m9.5 6 6 6-6 6" fill="none"/>';
const _chevronDown = '<path d="m6 9.5 6 6 6-6" fill="none"/>';
const _back = '<path d="M14.8 5.5 8.3 12l6.5 6.5" fill="none"/>';
const _gift =
    '<rect x="3.5" y="8" width="17" height="4.2" rx="1.1"/><path d="M5 12.2v7.2c0 .6.5 1.1 1.1 1.1h11.8c.6 0 1.1-.5 1.1-1.1v-7.2"/><path d="M12 8v12.5M12 8C10.5 4.6 6.6 4 6.6 6.5S9.4 8 12 8zm0 0c1.5-3.4 5.4-4 5.4-1.5S14.6 8 12 8z" fill="none"/>';
const _ban = '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12" fill="none"/>';
const _lifebuoy =
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4"/><path d="m6 6 3.6 3.6m4.8 4.8L18 18M18 6l-3.6 3.6m-4.8 4.8L6 18" fill="none"/>';
const _search = '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5" fill="none"/>';
const _searchOff = '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 8.5l5 5m0-5-5 5" fill="none"/>';
const _clock = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.1 2" fill="none"/>';
const _refresh =
    '<path d="M19.6 10.5A7.8 7.8 0 0 0 6 6.5L4.2 8.3M4 4v4.4h4.4M4.4 13.5A7.8 7.8 0 0 0 18 17.5l1.8-1.8M20 20v-4.4h-4.4" fill="none"/>';
const _pin = '<path d="M9 3.5h6l-.9 5 3.6 3.5v1.6H6.3V12L9.9 8.5z"/><path d="M12 13.6v7" fill="none"/>';
const _pause = '<rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/>';
const _flag = '<path d="M5 21V4.5" fill="none"/><path d="M5 4.5h11.2l-2.2 4.2 2.2 4.2H5"/>';
const _calendar = '<rect x="3.5" y="5" width="17" height="15.5" rx="2.4"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none"/>';
const _download = '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" fill="none"/>';
const _copy =
    '<rect x="8.5" y="8.5" width="12" height="12" rx="2.4"/><path d="M15.5 8.5V5.7a2.2 2.2 0 0 0-2.2-2.2H5.7a2.2 2.2 0 0 0-2.2 2.2v7.6a2.2 2.2 0 0 0 2.2 2.2h2.8" fill="none"/>';
const _sparkles =
    '<path d="M11 3.5 12.6 8a2 2 0 0 0 1.4 1.4L18.5 11l-4.5 1.6a2 2 0 0 0-1.4 1.4L11 18.5 9.4 14A2 2 0 0 0 8 12.6L3.5 11 8 9.4A2 2 0 0 0 9.4 8z"/><path d="M18.5 3v3M17 4.5h3M18 16.5v3M16.5 18h3" fill="none"/>';
const _clip = '<path d="m20 11.6-8.1 8.1a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7" fill="none"/>';
const _arrowRight = '<path d="M4.5 12h15M13.5 6l6 6-6 6" fill="none"/>';
const _arrowDown = '<path d="M12 4.5v15M6 13.5l6 6 6-6" fill="none"/>';
const _arrowUpRight = '<path d="M7 17 17 7M9 7h8v8" fill="none"/>';
const _arrowDownLeft = '<path d="M17 7 7 17M7 9v8h8" fill="none"/>';
const _plus = '<path d="M12 5v14M5 12h14" fill="none"/>';
const _grid =
    '<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>';
const _receipt =
    '<path d="M6 3.5h12v17l-2.4-1.5-2 1.5-1.6-1.5-1.6 1.5-2-1.5L6 20.5z"/><path d="M9 8.2h6M9 11.7h6M9 15.2h3.5" fill="none"/>';
const _video = '<rect x="3" y="6.5" width="12.5" height="11" rx="2.2"/><path d="m15.5 10.6 5.5-3v8.8l-5.5-3z"/>';
const _shield = '<path d="m12 3.5 7 2.8v5.4c0 4.4-3 7.6-7 8.8-4-1.2-7-4.4-7-8.8V6.3z"/><path d="m8.8 12.2 2.2 2.2 4.2-4.4" fill="none"/>';
const _thumbUp =
    '<path d="M7.5 10.6v9.9H5.1a1.6 1.6 0 0 1-1.6-1.6v-6.7c0-.9.7-1.6 1.6-1.6zm0 0 3.9-6.3a1.6 1.6 0 0 1 2.9 1.2l-.9 4.1h5a2 2 0 0 1 2 2.3l-1.2 7a2 2 0 0 1-2 1.6H7.5"/>';
const _thumbDown =
    '<path d="M7.5 13.4V3.5H5.1a1.6 1.6 0 0 0-1.6 1.6v6.7c0 .9.7 1.6 1.6 1.6zm0 0 3.9 6.3a1.6 1.6 0 0 0 2.9-1.2l-.9-4.1h5a2 2 0 0 0 2-2.3l-1.2-7a2 2 0 0 0-2-1.6H7.5"/>';
const _swap = '<path d="M4 8h15.5L16 4.5M20 16H4.5L8 19.5" fill="none"/>';
const _bag = '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.6a3 3 0 0 1 6 0V8" fill="none"/>';
const _share =
    '<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="6" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="m8.3 10.8 7-3.6m-7 6 7 3.6" fill="none"/>';
const _shareUp = '<path d="M12 15V3.5M8 7.5l4-4 4 4M5.5 11.5V19c0 .8.7 1.5 1.5 1.5h10c.8 0 1.5-.7 1.5-1.5v-7.5" fill="none"/>';
const _send = '<path d="M20.5 3.5 3.8 10.1l6.6 3.5 3.5 6.6z"/><path d="M20.5 3.5 10.4 13.6" fill="none"/>';
const _school =
    '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.6c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V11M21.5 9v5" fill="none"/>';
const _rocket =
    '<path d="M14.6 4.6c2.5-1 4.5-1 5.5-.6.5 1 .5 3-.6 5.5l-6 6-4.4-4.4z"/><path d="m9 11-3.5.5L3.5 14l4 .5m5.6.5-.5 3.5-2.5 2-.5-4M6.5 17.5l-2 2" fill="none"/><circle cx="15.6" cy="8.4" r="1.3"/>';
const _reply = '<path d="M9.5 6 4 11.5 9.5 17M4 11.5h9.5a6.5 6.5 0 0 1 6.5 6.5v1" fill="none"/>';
const _power = '<path d="M12 3.5V11M7 6.3a7.5 7.5 0 1 0 10 0" fill="none"/>';
const _banknote =
    '<rect x="2.5" y="6.5" width="19" height="11" rx="2.2"/><circle cx="12" cy="12" r="2.6"/><circle cx="6.2" cy="9.6" r=".9" fill="#000" fill-opacity="1" stroke="none"/><circle cx="17.8" cy="14.4" r=".9" fill="#000" fill-opacity="1" stroke="none"/>';
const _bell =
    '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0M3.5 8.6a8 8 0 0 1 2-4.1M20.5 8.6a8 8 0 0 0-2-4.1" fill="none"/>';
const _more =
    '<circle cx="6" cy="12" r="1.4" fill="#000" fill-opacity="1" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="#000" fill-opacity="1" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="#000" fill-opacity="1" stroke="none"/>';
const _coins =
    '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.4c-.5-.9-1.6-1.5-2.8-1.5-1.7 0-3 1-3 2.3s1.3 1.9 3 2.2 3 1 3 2.3-1.3 2.3-3 2.3c-1.2 0-2.3-.6-2.8-1.5M12 6.2v1.7m0 8.4v1.7" fill="none"/>';
const _mic = '<rect x="9" y="3.5" width="6" height="10.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3" fill="none"/>';
const _lockReset =
    '<path d="M4.6 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.3 4.3v4.6h4.6" fill="none"/><rect x="9.2" y="11.2" width="5.6" height="4.6" rx="1"/><path d="M10.4 11.2V10a1.6 1.6 0 0 1 3.2 0v1.2" fill="none"/>';
const _lockOpen = '<rect x="4.5" y="11" width="15" height="9.5" rx="2.2"/><path d="M8 11V7.5a4 4 0 0 1 7.7-1.6" fill="none"/>';
const _sun =
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2M4.6 4.6 6 6m12 12 1.4 1.4M2.5 12h2m15 0h2M4.6 19.4 6 18M18 6l1.4-1.4" fill="none"/>';
const _moon = '<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>';
const _info = '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.4" fill="none"/><circle cx="12" cy="7.9" r="1" fill="#000" fill-opacity="1" stroke="none"/>';
const _alertCircle = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6v5.3" fill="none"/><circle cx="12" cy="16.2" r="1" fill="#000" fill-opacity="1" stroke="none"/>';
const _hourglass =
    '<path d="M6.5 3.5h11M6.5 20.5h11" fill="none"/><path d="M7.6 3.5c0 4 4.4 5.5 4.4 8.5s-4.4 4.5-4.4 8.5h8.8c0-4-4.4-5.5-4.4-8.5s4.4-4.5 4.4-8.5z"/>';
const _help =
    '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.7c0 1.7-2.4 2-2.4 3.5" fill="none"/><circle cx="12" cy="16.9" r="1" fill="#000" fill-opacity="1" stroke="none"/>';
const _heart = '<path d="M12 19.6s-7.6-4.4-7.6-10.1A4.3 4.3 0 0 1 12 6.7a4.3 4.3 0 0 1 7.6 2.8c0 5.7-7.6 10.1-7.6 10.1z"/>';
const _pencil = '<path d="m15.4 4.6 4 4L9 19H5v-4z"/><path d="m13.3 6.7 4 4" fill="none"/>';
const _editNote = '<path d="M4 6.5h9M4 10.5h7M4 14.5h4" fill="none"/><path d="m13.5 20 7-7-2.5-2.5-7 7V20z"/>';
const _doneAll = '<path d="m2.5 12.6 4 4L15 8.1M11.5 16.6 20 8.1" fill="none"/>';
const _card = '<rect x="3" y="5.5" width="18" height="13" rx="2.4"/><path d="M3 10h18M7 15h3.5" fill="none"/>';
const _tool =
    '<path d="M20 7.6a4.2 4.2 0 0 1-5.6 3.9l-7.6 7.6a1.9 1.9 0 0 1-2.7-2.7l7.6-7.6A4.2 4.2 0 0 1 16.4 3l-2.4 2.5.4 2.2 2.2.4z"/>';
const _circle = '<circle cx="12" cy="12" r="8"/>';
const _camera =
    '<path d="M4.6 8h3l1.5-2.5h5.8L16.4 8h3a1.6 1.6 0 0 1 1.6 1.6v8.3a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.9V9.6A1.6 1.6 0 0 1 4.6 8z"/><circle cx="12" cy="13.2" r="3.4"/>';
const _cake =
    '<path d="M4.5 20.5h15" fill="none"/><rect x="5" y="12" width="14" height="8.5" rx="1.6"/><path d="M5 15.6c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M12 12V9.2" fill="none"/><path d="M12 6.8c-.9-.7-.9-1.9 0-3.1.9 1.2.9 2.4 0 3.1z"/>';
const _brokenImage =
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2.4"/><path d="m3.5 15 4-4 3 3 2-2 3.5 3.5" fill="none"/><circle cx="15" cy="9" r="1.3" fill="#000" fill-opacity="1" stroke="none"/>';
const _chart = '<path d="M5 20V11.5M10 20V5.5M15 20v-6.5M20 20V9.5" fill="none"/>';
const _plusCircle = '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8" fill="none"/>';
const _logout = '<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16.5 14.5 12 10 7.5M14.5 12H4.5" fill="none"/>';
const _globe = '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.5 5.2 3.5 8.5s-1.1 6.2-3.5 8.5c-2.4-2.3-3.5-5.2-3.5-8.5s1.1-6.2 3.5-8.5z" fill="none"/>';

/// Ilovada ishlatiladigan nomlar — eski Material nomlari bilan bir xil (almashtirish oson bo'lishi uchun).
class TI {
  TI._();
  static const home = TIData(_home);
  static const chat = TIData(_chat);
  static const wallet = TIData(_wallet);
  static const user = TIData(_user);
  static const book = TIData(_book);
  static const support = TIData(_headset);
  static const logout = TIData(_logout);
  static const globe = TIData(_globe);
  static const plusCircle = TIData(_plusCircle);

  static const warning_amber_rounded = TIData(_alert);
  static const description_outlined = TIData(_file);
  static const close_rounded = TIData(_close);
  static const chat_bubble_outline_rounded = TIData(_chat);
  static const visibility_outlined = TIData(_eye);
  static const visibility_off_outlined = TIData(_eyeOff);
  static const delete_outline_rounded = TIData(_trash);
  static const check_rounded = TIData(_check);
  static const account_balance_wallet_outlined = TIData(_wallet);
  static const wifi_off_rounded = TIData(_wifiOff);
  static const support_agent_rounded = TIData(_headset);
  static const star_rounded = TIData(_star, fill: true);
  static const play_arrow_rounded = TIData(_play, fill: true);
  static const menu_book_rounded = TIData(_book);
  static const inventory_2_outlined = TIData(_package);
  static const check_circle_rounded = TIData(_checkCircle, duo: true);
  static const balance_rounded = TIData(_scale);
  static const local_offer_rounded = TIData(_tag, duo: true);
  static const chevron_right_rounded = TIData(_chevronRight);
  static const check_circle_outline_rounded = TIData(_checkCircle);
  static const card_giftcard_rounded = TIData(_gift, duo: true);
  static const block_rounded = TIData(_ban);
  static const account_balance_wallet_rounded = TIData(_wallet, duo: true);
  static const visibility_rounded = TIData(_eye, duo: true);
  static const support_rounded = TIData(_lifebuoy);
  static const star_outline_rounded = TIData(_star);
  static const search_rounded = TIData(_search);
  static const schedule_rounded = TIData(_clock);
  static const refresh_rounded = TIData(_refresh);
  static const push_pin_rounded = TIData(_pin, duo: true);
  static const person_outline_rounded = TIData(_user);
  static const pause_rounded = TIData(_pause, fill: true);
  static const local_offer_outlined = TIData(_tag);
  static const highlight_off_rounded = TIData(_xCircle);
  static const grid_view_rounded = TIData(_grid, duo: true);
  static const flag_outlined = TIData(_flag);
  static const event_rounded = TIData(_calendar);
  static const download_rounded = TIData(_download);
  static const copy_rounded = TIData(_copy);
  static const chat_bubble_rounded = TIData(_chat, duo: true);
  static const back_hand_outlined = TIData(_hand);
  static const auto_awesome_rounded = TIData(_sparkles);
  static const attach_file_rounded = TIData(_clip);
  static const arrow_forward_rounded = TIData(_arrowRight);
  static const add_rounded = TIData(_plus);
  static const visibility_off_rounded = TIData(_eyeOff);
  static const videocam_rounded = TIData(_video);
  static const verified_user_rounded = TIData(_shield);
  static const thumb_up_alt_rounded = TIData(_thumbUp, duo: true);
  static const thumb_up_alt_outlined = TIData(_thumbUp);
  static const thumb_down_alt_rounded = TIData(_thumbDown, duo: true);
  static const thumb_down_alt_outlined = TIData(_thumbDown);
  static const swap_horiz_rounded = TIData(_swap);
  static const south_west_rounded = TIData(_arrowDownLeft);
  static const shopping_bag_outlined = TIData(_bag);
  static const share_rounded = TIData(_share);
  static const send_rounded = TIData(_send);
  static const search_off_rounded = TIData(_searchOff);
  static const school_rounded = TIData(_school);
  static const rocket_launch_rounded = TIData(_rocket, duo: true);
  static const rocket_launch_outlined = TIData(_rocket);
  static const reply_rounded = TIData(_reply);
  static const receipt_long_rounded = TIData(_receipt, duo: true);
  static const receipt_long_outlined = TIData(_receipt);
  static const power_settings_new_rounded = TIData(_power);
  static const play_circle_fill_rounded = TIData(_playCircle, duo: true);
  static const person_rounded = TIData(_user, duo: true);
  static const people_alt_rounded = TIData(_users, duo: true);
  static const payments_rounded = TIData(_banknote, duo: true);
  static const payments_outlined = TIData(_banknote);
  static const notifications_active_rounded = TIData(_bell);
  static const north_east_rounded = TIData(_arrowUpRight);
  static const more_horiz_rounded = TIData(_more);
  static const monetization_on_outlined = TIData(_coins);
  static const mic_rounded = TIData(_mic);
  static const lock_reset_rounded = TIData(_lockReset);
  static const lock_open_rounded = TIData(_lockOpen);
  static const light_mode_rounded = TIData(_sun);
  static const keyboard_arrow_down_rounded = TIData(_chevronDown);
  static const ios_share_rounded = TIData(_shareUp);
  static const inventory_2_rounded = TIData(_package, duo: true);
  static const insert_drive_file_rounded = TIData(_fileBlank, duo: true);
  static const info_rounded = TIData(_info);
  static const hourglass_empty_rounded = TIData(_hourglass);
  static const home_rounded = TIData(_home, duo: true);
  static const home_outlined = TIData(_home);
  static const help_outline_rounded = TIData(_help);
  static const group_rounded = TIData(_users, duo: true);
  static const group_outlined = TIData(_users);
  static const grid_view_outlined = TIData(_grid);
  static const favorite_rounded = TIData(_heart, duo: true);
  static const error_rounded = TIData(_alertCircle);
  static const error_outline_rounded = TIData(_alertCircle);
  static const edit_outlined = TIData(_pencil);
  static const edit_note_rounded = TIData(_editNote);
  static const done_rounded = TIData(_check);
  static const done_all_rounded = TIData(_doneAll);
  static const dark_mode_rounded = TIData(_moon);
  static const credit_card_rounded = TIData(_card);
  static const construction_rounded = TIData(_tool);
  static const circle_outlined = TIData(_circle);
  static const card_giftcard_outlined = TIData(_gift);
  static const camera_alt = TIData(_camera);
  static const calendar_today_rounded = TIData(_calendar);
  static const cake_outlined = TIData(_cake);
  static const broken_image_outlined = TIData(_brokenImage);
  static const bar_chart_rounded = TIData(_chart);
  static const back_hand_rounded = TIData(_hand, duo: true);
  static const autorenew_rounded = TIData(_refresh);
  static const auto_awesome = TIData(_sparkles, duo: true);
  static const arrow_downward_rounded = TIData(_arrowDown);
  static const arrow_back_ios_new_rounded = TIData(_back);
}
