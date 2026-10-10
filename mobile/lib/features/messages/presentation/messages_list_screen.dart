import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/user_avatar.dart';
import '../cubit/conversations_cubit.dart';
import '../data/message_model.dart';
import '../data/messages_repository.dart';
import 'chat_screen.dart';

class MessagesListScreen extends StatelessWidget {
  const MessagesListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ConversationsCubit(MessagesRepository())..load(),
      child: const _MessagesListView(),
    );
  }
}

class _MessagesListView extends StatelessWidget {
  const _MessagesListView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: () => context.read<ConversationsCubit>().load(),
        color: AppColors.indigo,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          slivers: [
            const AppHeaderSliver(),
            BlocBuilder<ConversationsCubit, ConversationsState>(
              builder: (context, state) {
                if (state.status == ConversationsStatus.loading && state.conversations.isEmpty) {
                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    sliver: SliverList.list(children: const [
                      SRow(),
                      SizedBox(height: 10),
                      SRow(),
                      SizedBox(height: 10),
                      SRow(),
                      SizedBox(height: 10),
                      SRow(),
                    ]),
                  );
                }
                if (state.status == ConversationsStatus.failure && state.conversations.isEmpty) {
                  return SliverFillRemaining(
                    child: Center(
                      child: Text(state.error ?? 'Xatolik', style: const TextStyle(color: AppColors.textMuted)),
                    ),
                  );
                }
                if (state.conversations.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Text("Hali suhbatlar yo'q", style: TextStyle(color: AppColors.textMuted)),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 100),
                  sliver: SliverList.separated(
                    itemCount: state.conversations.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (context, i) => _ConversationTile(conv: state.conversations[i]),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

String _initial(String name) {
  final clean = name.replaceFirst('@', '').trim();
  return clean.isEmpty ? '?' : clean.substring(0, 1).toUpperCase();
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conv});
  final ConversationModel conv;

  @override
  Widget build(BuildContext context) {
    final unread = conv.unread > 0;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ChatScreen(conversationId: conv.id, other: conv.other),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Row(
          children: [
            UserAvatar(imageUrl: conv.other.image, initial: _initial(conv.other.name), size: 46),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conv.other.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14.5,
                            fontWeight: unread ? FontWeight.w700 : FontWeight.w600,
                          ),
                        ),
                      ),
                      Text(timeAgo(conv.lastMessageAt),
                          style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conv.lastMessageBody == null
                              ? 'Suhbat boshlandi'
                              : (conv.lastMessageMine == true ? 'Siz: ${conv.lastMessageBody}' : conv.lastMessageBody!),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: unread ? AppColors.textSecondary : AppColors.textMuted,
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                      if (unread) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.indigo,
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text('${conv.unread}',
                              style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
