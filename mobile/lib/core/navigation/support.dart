import 'package:flutter/material.dart';

import '../../features/home/section_cubit.dart';
import '../../features/messages/data/message_model.dart';
import '../../features/messages/data/messages_repository.dart';
import '../../features/messages/presentation/chat_screen.dart';
import '../../widgets/skeleton.dart';
import '../ui/app_dialogs.dart';
import 'services.dart';

String _scopeOf(ServiceKind k) => switch (k) {
      ServiceKind.plus => 'plus',
      ServiceKind.smm => 'smm',
      ServiceKind.uz => 'uz',
    };

Future<ConversationModel?> _supportConversation() async {
  final list = await MessagesRepository().fetchConversations();
  final s = list.where((c) => c.other.isSupport).toList();
  return s.isEmpty ? null : s.first;
}

/// Qo'llab-quvvatlash çati — joriy xizmat bo'yicha (tayyorr+ da faqat tayyorr+ xabarlari, SMM da — SMM niki).
Future<void> openSupportChat(BuildContext context) async {
  final scope = _scopeOf(ServiceScope.of(context));
  try {
    final c = await _supportConversation();
    if (!context.mounted) return;
    if (c != null) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ChatScreen(conversationId: c.id, other: c.other, scope: scope)));
      return;
    }
    openUzSection(AppSection.messages);
  } catch (_) {
    if (context.mounted) showToast(context, "Internetga ulanib bölmadi", kind: ToastKind.error);
  }
}

/// Qobiq bo'limi sifatidagi support çati (tayyorr+ → "Yordam").
class SupportChatTab extends StatefulWidget {
  const SupportChatTab({super.key, required this.scope});
  final String scope;

  @override
  State<SupportChatTab> createState() => _SupportChatTabState();
}

class _SupportChatTabState extends State<SupportChatTab> {
  ConversationModel? _c;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final c = await _supportConversation();
      if (mounted) setState(() => _c = c);
      if (c == null && mounted) setState(() => _failed = true);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    if (c != null) return ChatScreen(conversationId: c.id, other: c.other, scope: widget.scope, embedded: true);
    if (_failed) {
      return Center(
        child: TextButton(
          onPressed: () {
            setState(() => _failed = false);
            _load();
          },
          child: const Text("Yuklab bölmadi — qayta uriniş"),
        ),
      );
    }
    return const Padding(padding: EdgeInsets.fromLTRB(16, 80, 16, 16), child: SBlock(height: 300));
  }
}
