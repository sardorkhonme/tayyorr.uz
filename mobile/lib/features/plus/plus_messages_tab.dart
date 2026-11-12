import 'package:flutter/material.dart';

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
        const WebPageTitle(
          'Xabarlar',
          subtitle: 'Qöllab-quvvatlaş xizmati va umumiy guruh',
        ),
        const SizedBox(height: 18),
        const FamilyListRow(),
        const SizedBox(height: 8),
        FamilySupportRow(onTap: () => openSupportChat(context)),
      ],
    );
  }
}
