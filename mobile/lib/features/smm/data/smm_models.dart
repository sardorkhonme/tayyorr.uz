import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';

Color _hex(String? h, [Color fallback = const Color(0xFF6366F1)]) {
  final s = (h ?? '').replaceFirst('#', '');
  final v = int.tryParse(s.length == 6 ? 'FF$s' : s, radix: 16);
  return v == null ? fallback : Color(v);
}

int _int(Object? v) => (v as num?)?.toInt() ?? 0;

class SmmPlatform {
  final String key;
  final String name;
  final Color from;
  final Color to;
  final String linkHint;
  const SmmPlatform(this.key, this.name, this.from, this.to, this.linkHint);

  factory SmmPlatform.fromJson(Map<String, dynamic> j) =>
      SmmPlatform('${j['key']}', '${j['name']}', _hex(j['from'] as String?), _hex(j['to'] as String?), '${j['linkHint'] ?? ''}');

  LinearGradient get gradient => LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [from, to]);
}

class SmmKind {
  final String key;
  final String label;
  final String hint;
  final Color color;
  const SmmKind(this.key, this.label, this.hint, this.color);

  factory SmmKind.fromJson(Map<String, dynamic> j) => SmmKind('${j['key']}', '${j['label']}', '${j['hint']}', _hex(j['color'] as String?));

  TIData get icon => switch (key) {
        'followers' => TI.group_rounded,
        'views' => TI.visibility_rounded,
        'likes' => TI.favorite_rounded,
        'comments' => TI.chat_bubble_rounded,
        'shares' => TI.share_rounded,
        _ => TI.grid_view_rounded,
      };
}

class SmmService {
  final String id;
  final String platform;
  final String kind;
  final String category;
  final String title;
  final List<String> tags;
  final String? description;
  final int rate;
  final int? oldRate;
  final int discount;
  final int min;
  final int max;
  final String guaranteeLabel;
  final bool guaranteeOk;
  final bool recommended;
  final String verdictReason;

  const SmmService({
    required this.id,
    required this.platform,
    required this.kind,
    required this.category,
    required this.title,
    required this.tags,
    this.description,
    required this.rate,
    this.oldRate,
    required this.discount,
    required this.min,
    required this.max,
    required this.guaranteeLabel,
    required this.guaranteeOk,
    required this.recommended,
    required this.verdictReason,
  });

  factory SmmService.fromJson(Map<String, dynamic> j) {
    final g = (j['guarantee'] as Map?) ?? const {};
    final v = (j['verdict'] as Map?) ?? const {};
    return SmmService(
      id: '${j['id']}',
      platform: '${j['platform']}',
      kind: '${j['kind']}',
      category: '${j['category'] ?? ''}',
      title: '${j['title']}',
      tags: (j['tags'] as List? ?? const []).map((e) => '$e').toList(),
      description: j['description'] as String?,
      rate: _int(j['rate']),
      oldRate: (j['oldRate'] as num?)?.toInt(),
      discount: _int(j['discount']),
      min: _int(j['min']),
      max: _int(j['max']),
      guaranteeLabel: '${g['label'] ?? ''}',
      guaranteeOk: g['ok'] == true,
      recommended: v['ok'] == true,
      verdictReason: '${v['reason'] ?? ''}',
    );
  }

  /// To'lanadigan summa: ceil(narx × miqdor / 1000) — saytdagi chargeFor bilan bir xil.
  int chargeFor(int qty) => (rate * qty / 1000).ceil();
}

class SmmCatalog {
  final List<SmmService> services;
  final List<SmmPlatform> platforms;
  final List<SmmKind> kinds;
  const SmmCatalog(this.services, this.platforms, this.kinds);

  factory SmmCatalog.fromJson(Map<String, dynamic> j) => SmmCatalog(
        (j['services'] as List? ?? const []).cast<Map<String, dynamic>>().map(SmmService.fromJson).toList(),
        (j['platforms'] as List? ?? const []).cast<Map<String, dynamic>>().map(SmmPlatform.fromJson).toList(),
        (j['kinds'] as List? ?? const []).cast<Map<String, dynamic>>().map(SmmKind.fromJson).toList(),
      );

  SmmPlatform platform(String key) =>
      platforms.firstWhere((p) => p.key == key, orElse: () => platforms.isNotEmpty ? platforms.last : const SmmPlatform('other', 'Boşqa', Color(0xFF6366F1), Color(0xFF4F46E5), ''));

  SmmKind kind(String key) =>
      kinds.firstWhere((k) => k.key == key, orElse: () => kinds.isNotEmpty ? kinds.last : const SmmKind('other', 'Boşqa', '', Color(0xFF8B5CF6)));
}

class SmmOrder {
  final String id;
  final String code;
  final String title;
  final List<String> tags;
  final String platform;
  final String platformName;
  final String kind;
  final String kindLabel;
  final String guaranteeLabel;
  final bool guaranteeOk;
  final String link;
  final int quantity;
  final int charge;
  final String status;
  final String statusLabel;
  final String statusHint;
  final bool active;
  final bool accepted;
  final int delivered;
  final int left;
  final int pct;
  final int? startCount;
  final int? expected;
  final int refund;
  final DateTime? checkedAt;
  final DateTime createdAt;

  const SmmOrder({
    required this.id,
    required this.code,
    required this.title,
    required this.tags,
    required this.platform,
    required this.platformName,
    required this.kind,
    required this.kindLabel,
    required this.guaranteeLabel,
    required this.guaranteeOk,
    required this.link,
    required this.quantity,
    required this.charge,
    required this.status,
    required this.statusLabel,
    required this.statusHint,
    required this.active,
    required this.accepted,
    required this.delivered,
    required this.left,
    required this.pct,
    this.startCount,
    this.expected,
    required this.refund,
    this.checkedAt,
    required this.createdAt,
  });

  bool get failed => status == 'FAILED' || status == 'CANCELED';

  Color get statusColor => switch (status) {
        'COMPLETED' => const Color(0xFF10B981),
        'PARTIAL' => const Color(0xFFF59E0B),
        'CANCELED' || 'FAILED' => const Color(0xFFF43F5E),
        'IN_PROGRESS' => const Color(0xFF6366F1),
        'PROCESSING' => const Color(0xFF0EA5E9),
        _ => const Color(0xFF71717A),
      };

  factory SmmOrder.fromJson(Map<String, dynamic> j) {
    final g = (j['guarantee'] as Map?) ?? const {};
    return SmmOrder(
      id: '${j['id']}',
      code: '${j['code']}',
      title: '${j['title']}',
      tags: (j['tags'] as List? ?? const []).map((e) => '$e').toList(),
      platform: '${j['platform']}',
      platformName: '${j['platformName']}',
      kind: '${j['kind']}',
      kindLabel: '${j['kindLabel']}',
      guaranteeLabel: '${g['label'] ?? ''}',
      guaranteeOk: g['ok'] == true,
      link: '${j['link']}',
      quantity: _int(j['quantity']),
      charge: _int(j['charge']),
      status: '${j['status']}',
      statusLabel: '${j['statusLabel']}',
      statusHint: '${j['statusHint']}',
      active: j['active'] == true,
      accepted: j['accepted'] == true,
      delivered: _int(j['delivered']),
      left: _int(j['left']),
      pct: _int(j['pct']),
      startCount: (j['startCount'] as num?)?.toInt(),
      expected: (j['expected'] as num?)?.toInt(),
      refund: _int(j['refund']),
      checkedAt: DateTime.tryParse('${j['checkedAt']}')?.toLocal(),
      createdAt: DateTime.tryParse('${j['createdAt']}')?.toLocal() ?? DateTime.now(),
    );
  }
}

class SmmOrdersData {
  final List<SmmOrder> orders;
  final int total;
  final int active;
  final int delivered;
  final int deliveredIn;
  final int spent;
  const SmmOrdersData(this.orders, this.total, this.active, this.delivered, this.deliveredIn, this.spent);

  factory SmmOrdersData.fromJson(Map<String, dynamic> j) {
    final s = (j['stats'] as Map?) ?? const {};
    return SmmOrdersData(
      (j['orders'] as List? ?? const []).cast<Map<String, dynamic>>().map(SmmOrder.fromJson).toList(),
      _int(s['total']),
      _int(s['active']),
      _int(s['delivered']),
      _int(s['deliveredIn']),
      _int(s['spent']),
    );
  }
}

class SmmTxn {
  final String id;
  final String type;
  final int amount;
  final DateTime createdAt;
  const SmmTxn(this.id, this.type, this.amount, this.createdAt);
}

class SmmOrderDetail {
  final SmmOrder order;
  final List<SmmTxn> txns;
  const SmmOrderDetail(this.order, this.txns);

  factory SmmOrderDetail.fromJson(Map<String, dynamic> j) => SmmOrderDetail(
        SmmOrder.fromJson(j['order'] as Map<String, dynamic>),
        (j['txns'] as List? ?? const [])
            .cast<Map<String, dynamic>>()
            .map((t) => SmmTxn('${t['id']}', '${t['type']}', _int(t['amount']), DateTime.tryParse('${t['createdAt']}')?.toLocal() ?? DateTime.now()))
            .toList(),
      );
}

class SmmGuideTerm {
  final List<String> names;
  final String title;
  final String text;
  final String tone;
  const SmmGuideTerm(this.names, this.title, this.text, this.tone);
}

class SmmGuideSection {
  final String id;
  final String title;
  final String lead;
  final List<SmmGuideTerm> terms;
  const SmmGuideSection(this.id, this.title, this.lead, this.terms);
}

class SmmGuide {
  final List<(String, String)> rules;
  final List<(String, String, String)> picks;
  final Map<String, String> tones;
  final List<SmmGuideSection> sections;
  const SmmGuide(this.rules, this.picks, this.tones, this.sections);

  factory SmmGuide.fromJson(Map<String, dynamic> j) => SmmGuide(
        (j['rules'] as List? ?? const []).cast<Map>().map((r) => ('${r['icon']}', '${r['text']}')).toList(),
        (j['picks'] as List? ?? const []).cast<Map>().map((p) => ('${p['icon']}', '${p['kind']}', '${p['text']}')).toList(),
        ((j['tones'] as Map?) ?? const {}).map((k, v) => MapEntry('$k', '$v')),
        (j['sections'] as List? ?? const [])
            .cast<Map>()
            .map((s) => SmmGuideSection(
                  '${s['id']}',
                  '${s['title']}',
                  '${s['lead']}',
                  (s['terms'] as List? ?? const [])
                      .cast<Map>()
                      .map((t) => SmmGuideTerm((t['names'] as List).map((e) => '$e').toList(), '${t['title']}', '${t['text']}', '${t['tone']}'))
                      .toList(),
                ))
            .toList(),
      );
}
