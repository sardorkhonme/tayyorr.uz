import 'package:flutter/material.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';

import '../../core/navigation/support.dart';
import '../../widgets/web_page.dart';
import '../../widgets/web_ui.dart';
import '../family/family_entry.dart';
import '../family/family_repository.dart';

/// tayyorr+ → «Xabarlar»: Tayyorr Support (tayyorr+ xabarlari) va «Tayyorr’s Family» guruhi.
class PlusMessagesTab extends StatefulWidget {
  const PlusMessagesTab({super.key});

  @override
  State<PlusMessagesTab> createState() => _PlusMessagesTabState();
}

class _PlusMessagesTabState extends State<PlusMessagesTab> {
  @override
  void initState() {
    super.initState();
    FamilySummary.instance.refresh(force: true);
  }

  @override
  Widget build(BuildContext context) {
    return WebPage(
      background: false,
      onRefresh: () => FamilySummary.instance.refresh(force: true),
      children: [
        const SizedBox(height: 8),
        const WebPageTitle('Xabarlar', subtitle: 'Qöllab-quvvatlaş xizmati va umumiy guruh'),
        const SizedBox(height: 18),
        const FamilyListRow(),
        const SizedBox(height: 10),
        _SupportRow(onTap: () => openSupportChat(context)),
      ],
    );
  }
}

class _SupportRow extends StatelessWidget {
  const _SupportRow({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: WebC.fill5,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: WebC.border),
        ),
        child: Row(children: [
          ValueListenableBuilder(
            valueListenable: FamilySummary.instance.support,
            builder: (context, sp, _) => SizedBox(
              width: 44,
              height: 44,
              child: ClipOval(
                child: (sp?.image ?? '').isNotEmpty
                    ? Image.network(sp!.image!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const _SupportFallback())
                    : const _SupportFallback(),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(
                  child: ValueListenableBuilder(
                    valueListenable: FamilySummary.instance.support,
                    builder: (context, sp, _) => Text(sp?.name ?? 'Tayyorr Support',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(width: 6),
                const TIcon(TI.check_circle_rounded, size: 14, color: Color(0xFF60A5FA)),
              ]),
              const SizedBox(height: 2),
              Text('Savol, muammo yoki taklif — yozing, yordam beramiz',
                  maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: WebC.zinc500, fontSize: 13)),
            ]),
          ),
          const SizedBox(width: 8),
          TIcon(TI.chevron_right_rounded, size: 20, color: WebC.zinc500),
        ]),
      ),
    );
  }
}

/// Profil rasmi bo'lmasa — logotip oq doirada.
class _SupportFallback extends StatelessWidget {
  const _SupportFallback();

  @override
  Widget build(BuildContext context) => Container(
        color: Colors.white,
        padding: const EdgeInsets.all(7),
        child: Image.asset('assets/logo-mark.png', filterQuality: FilterQuality.high),
      );
}
