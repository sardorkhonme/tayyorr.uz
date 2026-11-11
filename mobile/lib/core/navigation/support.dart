import 'package:flutter/material.dart';

import '../../features/home/section_cubit.dart';
import '../../features/messages/data/messages_repository.dart';
import '../../features/messages/presentation/chat_screen.dart';
import '../ui/app_dialogs.dart';
import 'services.dart';

/// Qo'llab-quvvatlash xizmati bilan çat (barça xizmatlar uçun bitta) — ilova ichida.
Future<void> openSupportChat(BuildContext context) async {
  try {
    final list = await MessagesRepository().fetchConversations();
    final s = list.where((c) => c.other.isSupport).toList();
    if (!context.mounted) return;
    if (s.isNotEmpty) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ChatScreen(conversationId: s.first.id, other: s.first.other)));
      return;
    }
    openUzSection(AppSection.messages);
  } catch (_) {
    if (context.mounted) showToast(context, "Internetga ulanib bölmadi", kind: ToastKind.error);
  }
}
