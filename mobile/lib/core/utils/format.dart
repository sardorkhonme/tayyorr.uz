import 'package:intl/intl.dart';

final _somFormat = NumberFormat.decimalPattern('en');

String formatSom(int amount) =>
    "${_somFormat.format(amount).replaceAll(',', ' ')} so'm";

/// Faqat raqam guruhlab: 120000 -> "120 000".
String groupDigits(int n) => _somFormat.format(n).replaceAll(',', ' ');

// Saytdagi src/lib/date.ts bilan bir xil oy nomlari.
const _months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

/// Sayt kabi doim Toshkent (+5) vaqti bo'yicha.
DateTime _tz(DateTime d) => d.toUtc().add(const Duration(hours: 5));

String _hm(DateTime t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

/// "3-mar" (joriy yildan boshqa bo'lsa yil bilan).
String shortDate(DateTime d) {
  final t = _tz(d);
  final s = '${t.day}-${_months[t.month - 1]}';
  return t.year == _tz(DateTime.now()).year ? s : '$s ${t.year}';
}

/// "3-mar, 14:20"
String shortDateTime(DateTime d) => '${shortDate(d)}, ${_hm(_tz(d))}';

bool _isToday(DateTime d) {
  final t = _tz(d), n = _tz(DateTime.now());
  return t.year == n.year && t.month == n.month && t.day == n.day;
}

/// Bugun — "14:20"; boshqa kun — "3-mar 14:20".
String smartTime(DateTime d) => _isToday(d) ? _hm(_tz(d)) : '${shortDate(d)} ${_hm(_tz(d))}';

/// Bugun — "14:20"; boshqa kun — "3-mar".
String smartDate(DateTime d) => _isToday(d) ? _hm(_tz(d)) : shortDate(d);

/// Saytdagi timeAgo bilan bir xil: "hozirgina", "5 daqiqa oldin", ...
String timeAgo(DateTime d) {
  final secs = DateTime.now().difference(d).inSeconds;
  if (secs < 60) return 'hozirgina';
  final mins = secs ~/ 60;
  if (mins < 60) return '$mins daqiqa oldin';
  final hrs = mins ~/ 60;
  if (hrs < 24) return '$hrs soat oldin';
  final days = hrs ~/ 24;
  if (days < 7) return '$days kun oldin';
  final weeks = days ~/ 7;
  if (weeks < 5) return '$weeks hafta oldin';
  final months = days ~/ 30;
  if (months < 12) return '$months oy oldin';
  return '${days ~/ 365} yil oldin';
}
