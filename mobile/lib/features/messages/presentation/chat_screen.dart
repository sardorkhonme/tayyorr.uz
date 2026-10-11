import 'dart:async';
import 'dart:io';
import 'dart:ui';

import 'package:dio/dio.dart' show CancelToken;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/user_avatar.dart';
import '../../../core/media/media_cache.dart';
import '../../../core/notifications/message_notifier.dart';
import '../../../widgets/link_text.dart';
import '../../../widgets/web_ui.dart';
import 'chat_composer.dart';
import 'chat_media.dart';
import '../../dashboard/data/order_model.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../../public_profile/presentation/public_profile_screen.dart';
import '../cubit/chat_cubit.dart';
import '../data/message_model.dart';
import '../data/messages_repository.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key, required this.conversationId, required this.other});

  final String conversationId;
  final ChatOtherUser other;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ChatCubit(MessagesRepository(), conversationId)..load(),
      child: _ChatView(initialOther: other),
    );
  }
}

class _ChatView extends StatefulWidget {
  const _ChatView({required this.initialOther});
  final ChatOtherUser initialOther;

  @override
  State<_ChatView> createState() => _ChatViewState();
}

class _ChatViewState extends State<_ChatView> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  // tanlangan / yozib olingan, hali yuborilmagan fayl (ko'rib chiqish uchun)
  PendingAttachment? _pending;
  CancelToken? _uploadToken;
  int _contractIndex = 0;
  Timer? _contractTimer;

  late final String _conversationId;

  // Javob iqtibosi bosilganda asl xabarga o'tib, uni "chaqnatish" uchun.
  final _itemKeys = <String, GlobalKey>{};
  String? _flashId;
  int _flashTick = 0;

  GlobalKey _keyFor(String id) => _itemKeys.putIfAbsent(id, GlobalKey.new);

  Future<void> _jumpTo(String id) async {
    final messages = context.read<ChatCubit>().state.messages;
    final index = messages.indexWhere((m) => m.id == id);
    if (index < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Asl xabar topilmadi (o'chirilgan yoki juda eski)")),
      );
      return;
    }
    // Xabar hali qurilmagan (ekrandan uzoqda) bo'lsa — taxminiy joyga
    // sakrab, keyin aniq joylashtiramiz.
    for (var attempt = 0; attempt < 4 && _itemKeys[id]?.currentContext == null; attempt++) {
      if (!_scrollController.hasClients) return;
      final pos = _scrollController.position;
      // ro'yxat teskari: oxirgi xabar — 0 pozitsiyada
      final frac = messages.length <= 1 ? 0.0 : (messages.length - 1 - index) / (messages.length - 1);
      _scrollController.jumpTo((pos.maxScrollExtent * frac).clamp(0.0, pos.maxScrollExtent));
      await WidgetsBinding.instance.endOfFrame;
    }
    final ctx = _itemKeys[id]?.currentContext;
    if (ctx == null || !ctx.mounted) return;
    await Scrollable.ensureVisible(
      ctx,
      alignment: 0.4,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
    if (!mounted) return;
    setState(() {
      _flashId = id;
      _flashTick++;
    });
  }

  @override
  void initState() {
    super.initState();
    // shu suhbat ochiq — unga bildirishnoma kelmaydi, borini olib tashlaymiz
    _conversationId = context.read<ChatCubit>().conversationId;
    MessageNotifier.instance.activeConversationId = _conversationId;
    MessageNotifier.instance.clearFor(_conversationId);
    _contractTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      final n = context.read<ChatCubit>().state.activeContracts.length;
      if (n > 1 && mounted) setState(() => _contractIndex = (_contractIndex + 1) % n);
    });
  }

  @override
  void dispose() {
    if (MessageNotifier.instance.activeConversationId == _conversationId) {
      MessageNotifier.instance.activeConversationId = null;
    }
    _controller.dispose();
    _scrollController.dispose();
    _contractTimer?.cancel();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    final pos = _scrollController.position;
    // ro'yxat teskari: 0 — eng past. Hali o'lchanmagan yoki allaqachon pastda bo'lsa — hech narsa qilmaymiz
    if (!pos.hasContentDimensions || pos.pixels <= 0) return;
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  Future<void> _send() async {
    final cubit = context.read<ChatCubit>();
    final text = _controller.text;
    final pending = _pending;
    if (pending != null) {
      // fayl hali yuklanayotgan bo'lsa — tugashini kutamiz (tugma xira turadi)
      if (!pending.ready) return;
      _controller.clear();
      setState(() => _pending = null);
      final msg = await cubit.sendPrepared(file: pending.prepared!, body: text);
      // yuborilgan faylni qayta yuklamaslik uchun keshdagi nusxani xabarga bog'laymiz
      if (msg != null) await MediaCache.instance.adopt(pending.localKey, msg.id, pending.name);
    } else {
      if (text.trim().isEmpty) return;
      _controller.clear();
      await cubit.send(text);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
  }

  /// Fayl tanlash — darhol yuborilmaydi: yuklanadi va ko'rib chiqish uchun ko'rsatiladi.
  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    await _stage(file.bytes!, file.name, mimeForExt((file.extension ?? '').toLowerCase()));
  }

  /// Ovozli xabar yozib olindi — u ham avval ko'rib chiqiladi (eshitib ko'rish mumkin).
  Future<void> _onRecorded(String path, Duration _) async {
    final f = File(path);
    final bytes = await f.readAsBytes();
    final name = path.split('/').last;
    await _stage(bytes, name, 'audio/mp4');
    unawaited(f.delete().catchError((_) => f));
  }

  Future<void> _stage(Uint8List bytes, String name, String type) async {
    _cancelPending();
    if (bytes.length > 100 * 1024 * 1024) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fayl 100MB dan katta')));
      return;
    }
    final key = 'local-${DateTime.now().microsecondsSinceEpoch}';
    await MediaCache.instance.putLocal(key, name, bytes);
    final pending = PendingAttachment(localKey: key, name: name, type: type, size: bytes.length);
    final token = CancelToken();
    if (!mounted) return;
    setState(() {
      _pending = pending;
      _uploadToken = token;
    });
    try {
      final prepared = await MessagesRepository().uploadChatFile(
        context.read<ChatCubit>().conversationId,
        bytes: bytes,
        filename: name,
        contentType: type,
        cancelToken: token,
        onProgress: (p) {
          if (mounted && identical(_pending, pending)) setState(() => pending.progress = p);
        },
      );
      if (mounted && identical(_pending, pending)) setState(() => pending.prepared = prepared);
    } catch (e) {
      if (token.isCancelled || !mounted || !identical(_pending, pending)) return;
      setState(() => _pending = null);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Faylni yuklab bo'lmadi — qayta urinib ko'ring")));
    }
  }

  void _cancelPending() {
    _uploadToken?.cancel();
    _uploadToken = null;
    if (_pending != null && mounted) setState(() => _pending = null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: BlocConsumer<ChatCubit, ChatState>(
            listenWhen: (p, c) => c.messages.length != p.messages.length,
            // yangi xabar kelganda pastga tushamiz — faqat foydalanuvchi pastda
            // turgan bo'lsa yoki xabar o'ziniki bo'lsa (eski xabarlarni o'qiyotganda sakratmaymiz)
            listener: (context, state) {
              final nearBottom = !_scrollController.hasClients || _scrollController.offset < 300;
              final mineLast = state.messages.isNotEmpty && state.messages.last.mine;
              if (nearBottom || mineLast) {
                WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
              }
            },
            builder: (context, state) {
              final other = state.other ?? widget.initialOther;
              return Column(
                children: [
                  _ChatHeader(other: other, blockedByMe: state.blockedByMe),
                  if (state.activeContracts.isNotEmpty)
                    _PinnedContractCard(
                      order: state.activeContracts[_contractIndex % state.activeContracts.length],
                      total: state.activeContracts.length,
                      index: _contractIndex % state.activeContracts.length,
                      onCycle: () =>
                          setState(() => _contractIndex = (_contractIndex + 1) % state.activeContracts.length),
                    ),
                  Expanded(
                    child: Builder(
                      builder: (context) {
                        if (state.status == ChatStatus.loading && state.messages.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                            child: Column(
                              children: const [
                                SBubble(widthFraction: 0.4),
                                SizedBox(height: 10),
                                SBubble(widthFraction: 0.5, mine: true),
                                SizedBox(height: 10),
                                SBubble(widthFraction: 0.6),
                                SizedBox(height: 10),
                                SBubble(widthFraction: 0.4, mine: true),
                                SizedBox(height: 10),
                                SBubble(widthFraction: 0.35),
                              ],
                            ),
                          );
                        }
                        if (state.status == ChatStatus.failure && state.messages.isEmpty) {
                          return Center(
                            child: Text(state.error ?? 'Xatolik', style: const TextStyle(color: AppColors.textMuted)),
                          );
                        }
                        if (state.blockedMe && !other.isSupport) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Text(
                                'Bu foydalanuvchi sizni bloklagan — xabar yoza olmaysiz.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: AppColors.textMuted),
                              ),
                            ),
                          );
                        }
                        if (state.messages.isEmpty) {
                          return const Center(
                            child: Text(
                              'Xabar yozing — suhbat shu yerdan boshlanadi',
                              style: TextStyle(color: AppColors.textMuted),
                            ),
                          );
                        }
                        // reverse — Telegramdagidek ro'yxat pastdan boshlanadi:
                        // rasm/video yuklanib balandlik o'zgarsa ham oxirgi
                        // xabar doim ko'rinib turadi.
                        return ListView.builder(
                          controller: _scrollController,
                          reverse: true,
                          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                          itemCount: state.messages.length,
                          itemBuilder: (context, i) {
                            final m = state.messages[state.messages.length - 1 - i];
                            return KeyedSubtree(
                              key: _keyFor(m.id),
                              child: _FlashHighlight(
                                flashKey: _flashId == m.id ? _flashTick : null,
                                child: _MessageBubble(
                                  message: m,
                                  hasActiveContract: state.activeContracts.isNotEmpty,
                                  pinnedOrderId:
                                      state.activeContracts.isNotEmpty ? state.activeContracts.first.id : null,
                                  onReplyTap: _jumpTo,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                  if (state.replyTo != null)
                    GestureDetector(
                      onTap: () => _jumpTo(state.replyTo!.id),
                      child: _ReplyBanner(message: state.replyTo!),
                    ),
                  if (!state.blockedMe && !state.blockedByMe && _pending != null)
                    PendingAttachmentBar(pending: _pending!, onCancel: _cancelPending),
                  if (!state.blockedMe && !state.blockedByMe)
                    ChatComposer(
                      controller: _controller,
                      onSend: _send,
                      onAttach: _pickFile,
                      onRecorded: _onRecorded,
                      hasAttachment: _pending != null,
                      attachmentReady: _pending?.ready ?? false,
                    )
                  else if (state.blockedByMe)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: OutlinedButton(
                        onPressed: () => context.read<ChatCubit>().toggleBlock(),
                        child: const Text('Blokdan chiqarish'),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader({required this.other, required this.blockedByMe});
  final ChatOtherUser other;
  final bool blockedByMe;

  String _presence(DateTime? lastSeenAt) {
    if (lastSeenAt == null) return 'oflayn';
    final diff = DateTime.now().difference(lastSeenAt);
    if (diff.inMinutes < 2) return 'onlayn';
    if (diff.inMinutes < 60) return '${diff.inMinutes} daq oldin onlayn';
    if (diff.inHours < 24) return '${diff.inHours} soat oldin onlayn';
    return '${diff.inDays} kun oldin onlayn';
  }

  @override
  Widget build(BuildContext context) {
    final online = other.lastSeenAt != null && DateTime.now().difference(other.lastSeenAt!).inMinutes < 2;
    // Saytdagi chat-room sarlavhasi: ‹ matnli tugma, 36px avatar, ism,
    // holat nuqtasi va 32x32 chegarali ⋮ tugma; pastda nozik chiziq.
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 10, 12, 10),
      decoration: BoxDecoration(
        color: WebC.headerBar,
        border: Border(bottom: BorderSide(color: WebC.border)),
      ),
      child: Row(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => Navigator.of(context).pop(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Text('‹', style: TextStyle(color: WebC.zinc400, fontSize: 26, height: 1)),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: other.isSupport
                  ? null
                  : () => Navigator.of(
                      context,
                    ).push(MaterialPageRoute(builder: (_) => PublicProfileScreen(userId: other.id))),
              child: Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: WebC.border),
                    ),
                    child: UserAvatar(imageUrl: other.image, initial: _initial(other.name), size: 36),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          other.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 2),
                        if (other.isSupport)
                          Text("Qo'llab-quvvatlash", style: TextStyle(color: WebC.emerald, fontSize: 12))
                        else
                          Row(
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: online ? WebC.emerald : WebC.zinc600,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  _presence(other.lastSeenAt),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: online ? WebC.emerald : WebC.zinc500, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (!other.isSupport)
            PopupMenuButton<String>(
              padding: EdgeInsets.zero,
              color: AppColors.surface,
              onSelected: (value) => _onMenuSelect(context, value),
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'report',
                  child: Text('Shikoyat qilish', style: TextStyle(color: AppColors.textPrimary)),
                ),
                PopupMenuItem(
                  value: 'block',
                  child: Text(
                    blockedByMe ? 'Blokdan chiqarish' : 'Bloklash',
                    style: TextStyle(color: AppColors.textPrimary),
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Text("Suhbatni o'chirish", style: TextStyle(color: AppColors.red)),
                ),
              ],
              child: Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: WebC.border),
                  color: WebC.fill5,
                ),
                child: Text('⋮', style: TextStyle(color: WebC.zinc300, fontSize: 16, height: 1)),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _onMenuSelect(BuildContext context, String value) async {
    final cubit = context.read<ChatCubit>();
    switch (value) {
      case 'report':
        await _showReportDialog(context);
        break;
      case 'block':
        await cubit.toggleBlock();
        break;
      case 'delete':
        final ok = await confirmDialog(
          context,
          title: "Suhbat o'chirilsinmi?",
          message: 'Suhbat ikkala tomondan ham o\'chiriladi.',
          confirmLabel: "Ha, o'chirish",
        );
        if (ok == true && context.mounted) {
          final done = await cubit.deleteConversation();
          if (done && context.mounted) Navigator.of(context).pop();
        }
        break;
    }
  }
}

Future<void> _showReportDialog(BuildContext context, {String? messageId}) async {
  final cubit = context.read<ChatCubit>();
  final text = TextEditingController();
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: AppColors.cardBorder)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Shikoyat qilish',
              style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            const Text(
              'Nima sodir bo\'lganini yozing (kamida 10 belgi).',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            AppTextField(label: 'Shikoyat matni', controller: text, maxLines: 4),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  if (text.text.trim().length < 10) return;
                  Navigator.of(sheetContext).pop();
                  final ok = await cubit.report(text.text.trim(), messageId: messageId);
                  if (ok && sheetContext.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Shikoyat yuborildi')));
                  }
                },
                child: const Text('Yuborish'),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

String _initial(String name) {
  final clean = name.replaceFirst('@', '').trim();
  return clean.isEmpty ? '?' : clean.substring(0, 1).toUpperCase();
}

class _PinnedContractCard extends StatelessWidget {
  const _PinnedContractCard({required this.order, required this.total, required this.index, required this.onCycle});
  final ChatContractOrderRef order;
  final int total;
  final int index;
  final VoidCallback onCycle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
      child: GestureDetector(
        onTap: () =>
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id))),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: AppColors.indigo.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.indigo.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.push_pin_rounded, size: 16, color: AppColors.indigo),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                        Text(
                          '${kOrderTypeLabel[order.type] ?? order.type} · ${kOrderStatusLabel[order.status] ?? order.status}'
                          '${total > 1 ? " · ${index + 1}/$total" : ""}',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  if (total > 1)
                    IconButton(
                      onPressed: onCycle,
                      icon: const Icon(Icons.swap_horiz_rounded, size: 18, color: AppColors.textMuted),
                    ),
                  Icon(Icons.chevron_right_rounded, color: AppColors.textFaint, size: 18),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ReplyBanner extends StatelessWidget {
  const _ReplyBanner({required this.message});
  final ChatMessageModel message;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.tint(0.05),
        borderRadius: BorderRadius.circular(12),
        border: const Border(left: BorderSide(color: AppColors.indigo, width: 3)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Javob berilmoqda',
                  style: TextStyle(color: AppColors.indigo, fontSize: 11, fontWeight: FontWeight.w700),
                ),
                Text(
                  message.deleted
                      ? "o'chirilgan xabar"
                      : (message.body.isNotEmpty ? message.body : (message.file?.name ?? 'xabar')),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => context.read<ChatCubit>().setReplyTo(null),
            icon: Icon(Icons.close_rounded, size: 18, color: AppColors.textFaint),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.hasActiveContract,
    this.pinnedOrderId,
    this.onReplyTap,
  });
  final ChatMessageModel message;
  final bool hasActiveContract;
  final String? pinnedOrderId;

  /// Iqtibos (javob berilgan xabar) bosilganda — o'sha xabarga o'tish.
  final void Function(String messageId)? onReplyTap;

  void _openMenu(BuildContext context) {
    if (message.deleted) return;
    final cubit = context.read<ChatCubit>();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: AppColors.cardBorder)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _ReactionButton(
                    icon: Icons.thumb_up_alt_rounded,
                    active: message.reactions.mine == 'LIKE',
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      cubit.react(message.id, message.reactions.mine == 'LIKE' ? null : 'LIKE');
                    },
                  ),
                  const SizedBox(width: 28),
                  _ReactionButton(
                    icon: Icons.thumb_down_alt_rounded,
                    active: message.reactions.mine == 'DISLIKE',
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      cubit.react(message.id, message.reactions.mine == 'DISLIKE' ? null : 'DISLIKE');
                    },
                  ),
                ],
              ),
            ),
            Divider(color: AppColors.cardBorder, height: 1),
            ListTile(
              leading: Icon(Icons.reply_rounded, color: AppColors.textSecondary),
              title: Text('Javob berish', style: TextStyle(color: AppColors.textPrimary)),
              onTap: () {
                Navigator.of(sheetContext).pop();
                cubit.setReplyTo(message);
              },
            ),
            if (message.file != null)
              ListTile(
                leading: Icon(Icons.download_rounded, color: AppColors.textSecondary),
                title: Text(
                  message.file!.isImage || message.file!.isVideo ? 'Galereyaga saqlash' : 'Yuklab olish',
                  style: TextStyle(color: AppColors.textPrimary),
                ),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  saveChatFile(context, message.file!, message.id);
                },
              ),
            if (message.body.isNotEmpty)
              ListTile(
                leading: Icon(Icons.copy_rounded, color: AppColors.textSecondary),
                title: Text('Nusxa olish', style: TextStyle(color: AppColors.textPrimary)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  Clipboard.setData(ClipboardData(text: message.body));
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nusxalandi')));
                },
              ),
            if (message.mine) ...[
              ListTile(
                leading: Icon(Icons.edit_outlined, color: AppColors.textSecondary),
                title: Text('Tahrirlash', style: TextStyle(color: AppColors.textPrimary)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _showEditSheet(context, cubit, message);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline_rounded, color: AppColors.red),
                title: const Text("O'chirish", style: TextStyle(color: AppColors.red)),
                onTap: () async {
                  Navigator.of(sheetContext).pop();
                  final ok = await confirmDialog(
                    context,
                    title: "O'chirilsinmi?",
                    message: "Xabar ikkala tomondan ham o'chiriladi.",
                    confirmLabel: "Ha, o'chirish",
                  );
                  if (ok == true) cubit.deleteMessage(message.id);
                },
              ),
            ] else
              ListTile(
                leading: const Icon(Icons.flag_outlined, color: AppColors.red),
                title: const Text('Shikoyat qilish', style: TextStyle(color: AppColors.red)),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _showReportDialog(context, messageId: message.id);
                },
              ),
          ],
        ),
      ),
    );
  }

  void _showEditSheet(BuildContext context, ChatCubit cubit, ChatMessageModel message) {
    final controller = TextEditingController(text: message.body);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: AppColors.cardBorder)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Xabarni tahrirlash',
                style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 14),
              AppTextField(label: 'Xabar', controller: controller, maxLines: 4),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final text = controller.text.trim();
                    if (text.isEmpty) return;
                    Navigator.of(sheetContext).pop();
                    cubit.editMessage(message.id, text);
                  },
                  child: const Text('Saqlash'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mine = message.mine;
    // "Mening" pufakcham har doim indigo fon + oq matn (rejimdan qat'i
    // nazar). Boshqasiniki esa sahifa foniga mos xira qatlam — shuning
    // uchun matn rangi rejimga qarab moslashishi kerak.
    final bubbleTextColor = mine ? Colors.white : AppColors.textPrimary;

    if (message.system) {
      return Align(
        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
          decoration: BoxDecoration(
            color: mine ? AppColors.indigo.withValues(alpha: 0.85) : AppColors.tint(0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message.body, style: TextStyle(color: bubbleTextColor, fontSize: 13.5, height: 1.4)),
              if (hasActiveContract && pinnedOrderId != null) ...[
                const SizedBox(height: 8),
                Divider(color: mine ? Colors.white24 : AppColors.cardBorder, height: 1),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => Navigator.of(
                    context,
                  ).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: pinnedOrderId!))),
                  child: Text(
                    'Buyurtmani ko\'rish ›',
                    style: TextStyle(color: bubbleTextColor, fontSize: 12.5, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    // Saytdagidek: pufakcha eni 86% gacha, 16px burchak; yonida 28x28 ⋮
    // tugma (meniki — chapda, boshqaniki — o'ngda), vaqt o'ng tomonda.
    final timeColor = mine ? const Color(0xFFC7D2FE) : WebC.zinc500;
    final menuBtn = message.deleted
        ? const SizedBox(width: 28)
        : GestureDetector(
            onTap: () => _openMenu(context),
            child: Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: AppColors.isLight
                      ? Colors.black.withValues(alpha: 0.15)
                      : Colors.white.withValues(alpha: 0.15),
                ),
                color: WebC.fill10,
              ),
              child: Text('⋮', style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1)),
            ),
          );
    final bubble = GestureDetector(
      onLongPress: () => _openMenu(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: mine ? const Color(0xFF4F39F6) : WebC.fill5,
          borderRadius: BorderRadius.circular(16),
          border: mine ? null : Border.all(color: WebC.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (message.replyTo != null)
              _ReplyQuote(
                reply: message.replyTo!,
                mine: mine,
                onTap: onReplyTap == null ? null : () => onReplyTap!(message.replyTo!.id),
              ),
            if (message.file != null) ChatAttachment(file: message.file!, cacheKey: message.id, mine: mine),
            if (!message.deleted && message.body.isNotEmpty) ...[
              if (message.file != null) const SizedBox(height: 6),
              LinkText(
                message.body,
                style: TextStyle(color: mine ? Colors.white : WebC.zinc200, fontSize: 14, height: 1.45),
                linkColor: mine ? Colors.white : WebC.indigoSoft,
              ),
            ],
            if (message.deleted)
              Text(
                "o'chirilgan xabar",
                style: TextStyle(color: timeColor, fontStyle: FontStyle.italic, fontSize: 14),
              ),
            const SizedBox(height: 2),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  '${message.edited && !message.deleted ? 'tahrirlangan · ' : ''}${_time(message.createdAtDate)}',
                  style: TextStyle(color: timeColor, fontSize: 10),
                ),
                // Telegramdagidek: ✓ — yetkazildi, ✓✓ — o'qildi
                if (mine && !message.deleted) ...[
                  const SizedBox(width: 3),
                  Icon(
                    message.readAt != null ? Icons.done_all_rounded : Icons.done_rounded,
                    size: 14,
                    color: message.readAt != null ? const Color(0xFF7DD3FC) : timeColor,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, c) {
              return Row(
                mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (mine) ...[menuBtn, const SizedBox(width: 6)],
                  ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: c.maxWidth * 0.86 - 34),
                    child: IntrinsicWidth(child: bubble),
                  ),
                  if (!mine) ...[const SizedBox(width: 6), menuBtn],
                ],
              );
            },
          ),
          if (message.reactions.like > 0 || message.reactions.dislike > 0)
            Padding(
              padding: EdgeInsets.only(top: 4, left: mine ? 0 : 4, right: mine ? 34 : 0),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (message.reactions.like > 0) _ReactionCountPill(icon: '👍', count: message.reactions.like),
                  if (message.reactions.like > 0 && message.reactions.dislike > 0) const SizedBox(width: 6),
                  if (message.reactions.dislike > 0) _ReactionCountPill(icon: '👎', count: message.reactions.dislike),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _time(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _ReplyQuote extends StatelessWidget {
  const _ReplyQuote({required this.reply, required this.mine, this.onTap});
  final ReplyPreviewModel reply;
  final bool mine;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.only(left: 8, top: 2, bottom: 2),
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: mine ? const Color(0xFFA5B4FC) : WebC.indigo, width: 2)),
      ),
      child: Text(
        reply.deleted ? "o'chirilgan xabar" : reply.text,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(color: mine ? const Color(0xFFC7D2FE) : WebC.zinc400, fontSize: 12),
      ),
      ),
    );
  }
}

class _ReactionButton extends StatelessWidget {
  const _ReactionButton({required this.icon, required this.active, required this.onTap});
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: active ? AppColors.indigo.withValues(alpha: 0.2) : AppColors.tint(0.05),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 22, color: active ? AppColors.indigo : AppColors.textSecondary),
      ),
    );
  }
}

class _ReactionCountPill extends StatelessWidget {
  const _ReactionCountPill({required this.icon, required this.count});
  final String icon;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.tint(0.06),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Text('$icon $count', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
    );
  }
}

/// Telegramdagidek: o'tilgan xabar orqasida yumshoq indigo nur ikki marta
/// "lip-lip" yonib, so'nadi. [flashKey] o'zgarganda animatsiya qayta boshlanadi.
class _FlashHighlight extends StatefulWidget {
  const _FlashHighlight({required this.flashKey, required this.child});
  final int? flashKey;
  final Widget child;

  @override
  State<_FlashHighlight> createState() => _FlashHighlightState();
}

class _FlashHighlightState extends State<_FlashHighlight> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));
  late final Animation<double> _a = TweenSequence<double>([
    TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.0).chain(CurveTween(curve: Curves.easeOut)), weight: 14),
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.35), weight: 16),
    TweenSequenceItem(tween: Tween(begin: 0.35, end: 1.0), weight: 14),
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0).chain(CurveTween(curve: Curves.easeIn)), weight: 56),
  ]).animate(_c);

  @override
  void initState() {
    super.initState();
    if (widget.flashKey != null) _c.forward(from: 0);
  }

  @override
  void didUpdateWidget(covariant _FlashHighlight old) {
    super.didUpdateWidget(old);
    if (widget.flashKey != null && widget.flashKey != old.flashKey) _c.forward(from: 0);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _a,
      child: widget.child,
      builder: (context, child) => DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xFF6366F1).withValues(alpha: 0.28 * _a.value),
          borderRadius: BorderRadius.circular(14),
        ),
        child: child,
      ),
    );
  }
}
