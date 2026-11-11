import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Ijtimoiy tarmoq belgilari (oq, rangli fon ustida) — smm-app/src/components/platform-icon.tsx bilan bir xil.
class PlatformIcon extends StatelessWidget {
  const PlatformIcon(this.platform, {super.key, this.size = 24, this.color = Colors.white});
  final String platform;
  final double size;
  final Color color;

  static const _svg = <String, String>{
    'instagram':
        '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="#000" stroke="none"/></svg>',
    'telegram':
        '<svg viewBox="0 0 24 24" fill="#000"><path d="M21.2 4.6 18.2 18.8c-.23 1-.82 1.25-1.66.78l-4.6-3.39-2.22 2.14c-.25.25-.45.45-.93.45l.33-4.7 8.54-7.72c.37-.33-.08-.51-.58-.18L6.53 12.83 2 11.42c-.99-.31-1-.99.21-1.46L19.95 3.1c.82-.3 1.54.2 1.25 1.5z"/></svg>',
    'tiktok':
        '<svg viewBox="0 0 24 24" fill="#000"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.470 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/></svg>',
    'youtube':
        '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" fill="#000" d="M6.5 5.5h11a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-11a4 4 0 0 1-4-4v-5a4 4 0 0 1 4-4zM10 9.2v5.6l4.8-2.8z"/></svg>',
    'facebook':
        '<svg viewBox="0 0 24 24" fill="#000"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.33-.04-1.56-.14-2.86-.14C11.93 2 10 3.66 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>',
    'twitter':
        '<svg viewBox="0 0 24 24" fill="#000"><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77zm-1.08 16.18h1.7L7.4 4.73H5.58z"/></svg>',
    'other':
        '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3.5 12.6 8a2 2 0 0 0 1.4 1.4L18.5 11l-4.5 1.6a2 2 0 0 0-1.4 1.4L11 18.5 9.4 14A2 2 0 0 0 8 12.6L3.5 11 8 9.4A2 2 0 0 0 9.4 8z"/><path d="M18.5 3v3M17 4.5h3"/></svg>',
  };

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      _svg[platform] ?? _svg['other']!,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }
}
