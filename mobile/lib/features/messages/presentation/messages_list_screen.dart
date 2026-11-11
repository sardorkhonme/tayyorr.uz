import 'package:tayyorr_app/core/ui/ticons.dart';
import '../../family/family_entry.dart';
import '../../family/family_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/unread_counter.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../cubit/conversations_cubit.dart';
import '../data/message_model.dart';
import '../data/messages_repository.dart';
import 'chat_screen.dart';

/// Saytdagi /messages ro'yxati (bu sahifadagi timeAgo boshqacha: "hozir", "5 daq oldin").
String _ago(DateTime d) {
  final s = DateTime.now().difference(d).inSeconds;
  if (s < 60) return 'hozir';
  if (s < 3600) return '${s ~/ 60} daq oldin';
  if (s < 86400) return '${s ~/ 3600} soat oldin';
  return shortDate(d);
}

class MessagesListScreen extends StatelessWidget {
  const MessagesListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        FamilySummary.instance.refresh();
        return ConversationsCubit(MessagesRepository())..load();
      },
      child: const _MessagesListView(),
    );
  }
}

class _MessagesListView extends StatelessWidget {
  const _MessagesListView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ConversationsCubit, ConversationsState>(
      builder: (context, state) {
        final loading = (state.status == ConversationsStatus.loading || state.status == ConversationsStatus.initial) && state.conversations.isEmpty;
        return WebPage(
          background: false,
          onRefresh: () async {
            FamilySummary.instance.refresh(force: true);
            await context.read<ConversationsCubit>().load();
            UnreadCounter.instance.refresh();
          },
          children: [
            Text('Xabarlar', style: TextStyle(color: WebC.white, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: -0.4)),
            const SizedBox(height: 20),
            // «Tayyorr's Family» — umumiy guruh, doim tepada
            const FamilyListRow(),
            const SizedBox(height: 8),
            if (loading)
              for (var i = 0; i < 5; i++) ...[const _ConversationSkeleton(), const SizedBox(height: 8)]
            else if (state.conversations.isEmpty)
              WebCard(
                child: Text(
                  state.status == ConversationsStatus.failure
                      ? (state.error ?? "Yuklab bölmadi")
                      : "Hozirça suhbat yöq. Buyurtma sahifasida tayyorlovçi yonidagi «Çat» tugmasidan suhbat boşlaşingiz mumkin.",
                  style: TextStyle(color: WebC.zinc500, fontSize: 14, height: 1.45),
                ),
              )
            else
              for (final c in state.conversations) ...[
                _ConversationTile(conv: c),
                const SizedBox(height: 8),
              ],
          ],
        );
      },
    );
  }
}

/// [_ConversationTile] skeleti: 44px avatar, ism + vaqt, oxirgi xabar.
class _ConversationSkeleton extends StatelessWidget {
  const _ConversationSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(color: WebC.cardBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: WebC.cardBorder)),
      child: const Row(children: [
        SCircle(size: 44),
        SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Expanded(child: Align(alignment: Alignment.centerLeft, child: SBar(width: 130, height: 15))), SizedBox(width: 8), SBar(width: 36, height: 11)]),
            SizedBox(height: 7),
            SBar(width: 200, height: 12),
          ]),
        ),
      ]),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conv});
  final ConversationModel conv;

  @override
  Widget build(BuildContext context) {
    final c = conv;
    final support = c.other.isSupport;
    final img = c.other.image ?? '';
    final lastAt = c.lastMessageCreatedAt;
    final hasLast = c.lastMessageBody != null || lastAt != null;
    final fileOnly = hasLast && (c.lastMessageBody ?? '').isEmpty;
    final prefix = hasLast && c.lastMessageMine == true ? 'Siz: ' : '';
    final preview = hasLast ? (fileOnly ? 'fayl' : c.lastMessageBody!) : 'Suhbat boşlandi';

    Widget avatar;
    if (c.blockedMe) {
      avatar = TIcon(TI.block_rounded, size: 20, color: WebC.zinc500);
    } else if (img.isNotEmpty) {
      avatar = Image.network(img, fit: BoxFit.cover, width: 44, height: 44, errorBuilder: (_, __, ___) => const SizedBox());
    } else if (support) {
      avatar = TIcon(TI.support_rounded, size: 22, color: WebC.indigoSoft);
    } else {
      avatar = const SizedBox();
    }

    final card = Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: support ? const Color(0xFF6366F1).withValues(alpha: 0.06) : WebC.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: support ? const Color(0xFF818CF8).withValues(alpha: 0.30) : WebC.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(shape: BoxShape.circle, color: WebC.fill5, ),
            foregroundDecoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: WebC.border)),
            child: avatar,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (support) ...[
                      TIcon(TI.push_pin_rounded, size: 13, color: WebC.indigo),
                      const SizedBox(width: 6),
                    ],
                    Expanded(
                      child: Text(c.other.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w500)),
                    ),
                    if (lastAt != null) ...[
                      const SizedBox(width: 8),
                      Text(_ago(lastAt), style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Expanded(
                      child: Text.rich(
                          TextSpan(children: [
                            if (prefix.isNotEmpty) TextSpan(text: prefix),
                            if (fileOnly) iconSpan(TI.attach_file_rounded, size: 14, color: WebC.zinc400, gap: 2),
                            TextSpan(text: preview),
                          ]),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: WebC.zinc400, fontSize: 14)),
                    ),
                    if (c.unread > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFF6366F1), borderRadius: BorderRadius.circular(999)),
                        child: Text(c.unread > 99 ? '99+' : '${c.unread}',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ChatScreen(conversationId: c.id, other: c.other)),
        );
        if (context.mounted) {
          context.read<ConversationsCubit>().load();
          UnreadCounter.instance.refresh();
        }
      },
      child: card,
    );
  }
}
