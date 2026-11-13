import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:tayyorr_app/core/ui/liquid_glass.dart';
import '../../../core/ui/app_dialogs.dart';
import 'dart:async';
import 'dart:io';
import 'dart:ui';

import 'package:dio/dio.dart' show CancelToken;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/reaction_emoji.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/user_avatar.dart';
import '../../../core/media/media_cache.dart';
import '../../../core/navigation/open_internal.dart';
import '../../../core/notifications/message_notifier.dart';
import '../../../widgets/link_text.dart';
import '../../../widgets/mascot.dart';
import '../../../widgets/web_ui.dart';
import 'chat_composer.dart';
import 'chat_media.dart';
import 'chat_widgets.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../../public_profile/presentation/public_profile_screen.dart';
import '../../family/family_popup.dart' show FamilyPopupAction, showFamilyPopup;
import '../cubit/chat_cubit.dart';
import '../data/message_model.dart';
import '../data/messages_repository.dart';
import '../../../widgets/app_header_sliver.dart' show kHeaderGap, kHeaderSide;

class ChatScreen extends StatelessWidget {
  const ChatScreen({
    super.key,
    required this.conversationId,
    required this.other,
    this.scope = 'uz',
    this.embedded = false,
  });

  final String conversationId;
  final ChatOtherUser other;

  /// Support çati qaysi xizmatniki ('uz' | 'plus' | 'smm').
  final String scope;

  /// Qobiq bo'limi sifatida (pastki panel bilan) — orqaga tugmasi yo'q.
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          ChatCubit(MessagesRepository(scope: scope), conversationId)..load(),
      child: _ChatView(initialOther: other, scope: scope, embedded: embedded),
    );
  }
}

/// Ochiladigan suhbat: id va suhbatdoş.
typedef ChatTarget = ({String id, ChatOtherUser other});

/// Suhbat hali aniqlanmagan (masalan «Yoziş» — suhbat serverda yaratiladi, yoki support suhbati
/// qidiriladi) — sahifa DARHOL oçiladi, çat skeleti körinadi; suhbat topilgaç çatning özi.
class PendingChatScreen extends StatefulWidget {
  const PendingChatScreen({
    super.key,
    required this.resolve,
    this.other,
    this.scope = 'uz',
    this.embedded = false,
    this.onMissing,
  });

  final Future<ChatTarget?> Function() resolve;

  /// Oldindan maʼlum suhbatdoş — skelet sarlavhasida darhol körinadi.
  final ChatOtherUser? other;
  final String scope;
  final bool embedded;

  /// Suhbat topilmadi (null) — sahifa yopiladi va şu çaqiriladi.
  final VoidCallback? onMissing;

  @override
  State<PendingChatScreen> createState() => _PendingChatScreenState();
}

class _PendingChatScreenState extends State<PendingChatScreen> {
  ChatTarget? _target;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final t = await widget.resolve();
      if (!mounted) return;
      if (t == null) {
        if (widget.embedded) {
          setState(() => _error = "Suhbat topilmadi");
        } else {
          Navigator.of(context).maybePop();
          widget.onMissing?.call();
        }
        return;
      }
      setState(() => _target = t);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = _target;
    if (t != null) {
      return ChatScreen(
        conversationId: t.id,
        other: t.other,
        scope: widget.scope,
        embedded: widget.embedded,
      );
    }
    final view = ChatSkeletonView(
      other: widget.other,
      embedded: widget.embedded,
      body: _error == null
          ? null
          : Center(
              child: SingleChildScrollView(
                child: ErrorState.from(_error, () {
                  setState(() => _error = null);
                  _load();
                }),
              ),
            ),
    );
    return widget.embedded
        ? view
        : Scaffold(body: AuroraBackground(child: view));
  }
}

/// Çat oçilguncha — çat ekranining özi kabi: sarlavha (avatar + ism), pastdan pufakçalar,
/// yoziş maydoni. [other] maʼlum bölsa sarlavhada darhol haqiqiy ism va rasm.
class ChatSkeletonView extends StatelessWidget {
  const ChatSkeletonView({
    super.key,
    this.other,
    this.embedded = false,
    this.body,
  });
  final ChatOtherUser? other;
  final bool embedded;

  /// Pufakçalar örniga (masalan xato holati).
  final Widget? body;

  @override
  Widget build(BuildContext context) {
    final o = other;
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(kHeaderSide, 6, kHeaderSide, 6),
            child: Row(
              children: [
                if (!embedded) ...[
                  GlassTap(
                    width: 48,
                    height: 48,
                    strong: true,
                    onTap: () => Navigator.of(context).maybePop(),
                    semanticLabel: 'Orqaga',
                    child: TIcon(
                      TI.arrow_back_ios_new_rounded,
                      size: 19,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(width: kHeaderGap),
                ],
                Expanded(
                  child: LiquidGlass(
                    height: 48,
                    borderRadius: BorderRadius.circular(24),
                    strong: true,
                    padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
                    child: Row(
                      children: [
                        if (o == null)
                          const SCircle(size: 36)
                        else
                          UserAvatar(
                            imageUrl: o.image,
                            initial: _initial(o.name),
                            size: 36,
                          ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (o == null)
                                const SBar(width: 130, height: 14)
                              else
                                Text(
                                  o.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: WebC.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              const SizedBox(height: 6),
                              const SBar(width: 70, height: 10),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child:
                body ??
                const Padding(
                  padding: EdgeInsets.fromLTRB(14, 12, 14, 12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      SBubble(widthFraction: 0.55),
                      SizedBox(height: 10),
                      SBubble(widthFraction: 0.4, mine: true),
                      SizedBox(height: 10),
                      SBubble(widthFraction: 0.6),
                    ],
                  ),
                ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: SBar(height: 48, borderRadius: 24),
          ),
        ],
      ),
    );
  }
}

class _ChatView extends StatefulWidget {
  const _ChatView({
    required this.initialOther,
    this.scope = 'uz',
    this.embedded = false,
  });
  final ChatOtherUser initialOther;
  final String scope;
  final bool embedded;

  @override
  State<_ChatView> createState() => _ChatViewState();
}

class _ChatViewState extends State<_ChatView> with RouteSettleMixin {
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

  // yangi xabarlar paydo bo'lish animatsiyasi (bir marta)
  final _fresh = <String>{};
  final _known = <String>{};

  /// Birinçi (keşdagi yoki serverdan kelgan) röyxat körilgan — undan keyingi har yangi xabar animatsiyali.
  bool _seeded = false;

  /// Yuqorida (eski xabarlarni öqib) turganda kelgan yangi xabarlar — «↓» tugmasida son.
  int _unseen = 0;

  void _onScroll() {
    if (_unseen > 0 &&
        _scrollController.hasClients &&
        _scrollController.offset < 80) {
      setState(() => _unseen = 0);
    }
  }

  void _markFresh(String k) {
    _fresh.add(k);
    Future.delayed(const Duration(milliseconds: 500), () => _fresh.remove(k));
  }

  Future<void> _jumpTo(String msgId) async {
    final messages = context.read<ChatCubit>().state.messages;
    final index = messages.indexWhere((m) => m.id == msgId);
    if (index < 0) {
      showToast(context, "Asl xabar topilmadi (öçirilgan yoki juda eski)");
      return;
    }
    // ro'yxat kaliti — clientId ?? id
    final id = messages[index].stableKey;
    // Xabar hali qurilmagan (ekrandan uzoqda) bo'lsa — taxminiy joyga
    // sakrab, keyin aniq joylashtiramiz.
    for (
      var attempt = 0;
      attempt < 4 && _itemKeys[id]?.currentContext == null;
      attempt++
    ) {
      if (!_scrollController.hasClients) return;
      final pos = _scrollController.position;
      // ro'yxat teskari: oxirgi xabar — 0 pozitsiyada
      final frac = messages.length <= 1
          ? 0.0
          : (messages.length - 1 - index) / (messages.length - 1);
      _scrollController.jumpTo(
        (pos.maxScrollExtent * frac).clamp(0.0, pos.maxScrollExtent),
      );
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
    // keşdagi xabarlar — tarix (animatsiyasiz)
    final initial = context.read<ChatCubit>().state;
    if (initial.status == ChatStatus.success) {
      _known.addAll(initial.messages.map((m) => m.stableKey));
      _seeded = true;
    }
    MessageNotifier.instance.activeConversationId = _conversationId;
    MessageNotifier.instance.clearFor(_conversationId);
    _scrollController.addListener(_onScroll);
    _contractTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      final n = context.read<ChatCubit>().state.activeContracts.length;
      if (n > 1 && mounted) {
        setState(() => _contractIndex = (_contractIndex + 1) % n);
      }
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

  /// Optimistik: xabar darhol ro'yxatda paydo bo'ladi (soat belgisi bilan), server javobi kelganda
  /// o'z joyida almashadi — yo'qolib qayta chiqmaydi.
  Future<void> _send() async {
    final cubit = context.read<ChatCubit>();
    final text = _controller.text;
    final pending = _pending;
    // fayl hali yuklanayotgan bo'lsa — tugashini kutamiz (tugma xira turadi)
    if (pending != null && !pending.ready) return;
    if (pending == null && text.trim().isEmpty) return;
    final clientId = 'c${DateTime.now().microsecondsSinceEpoch}';
    _controller.clear();
    setState(() => _pending = null);
    ChatFileModel? fileModel;
    if (pending != null) {
      // mahalliy fayl xabarning doimiy kesh kalitiga (clientId) — qayta yuklanmaydi
      await MediaCache.instance.adopt(pending.localKey, clientId, pending.name);
      fileModel = ChatFileModel(
        name: pending.name,
        type: pending.type,
        size: pending.size,
        url: '',
      );
    }
    _markFresh(clientId);
    _known.add(clientId);
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    await cubit.sendOptimistic(
      clientId: clientId,
      body: text,
      file: pending?.prepared,
      fileModel: fileModel,
    );
  }

  /// Fayl tanlash — darhol yuborilmaydi: yuklanadi va ko'rib chiqish uchun ko'rsatiladi.
  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    await _stage(
      file.bytes!,
      file.name,
      mimeForExt((file.extension ?? '').toLowerCase()),
    );
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
      showToast(context, 'Fayl 100MB dan katta', kind: ToastKind.error);
      return;
    }
    final key = 'local-${DateTime.now().microsecondsSinceEpoch}';
    await MediaCache.instance.putLocal(key, name, bytes);
    final pending = PendingAttachment(
      localKey: key,
      name: name,
      type: type,
      size: bytes.length,
    );
    final token = CancelToken();
    if (!mounted) return;
    setState(() {
      _pending = pending;
      _uploadToken = token;
    });
    try {
      final prepared = await MessagesRepository(scope: widget.scope)
          .uploadChatFile(
            context.read<ChatCubit>().conversationId,
            bytes: bytes,
            filename: name,
            contentType: type,
            cancelToken: token,
            onProgress: (p) {
              if (mounted && identical(_pending, pending)) {
                setState(() => pending.progress = p);
              }
            },
          );
      if (mounted && identical(_pending, pending)) {
        setState(() => pending.prepared = prepared);
      }
    } catch (e) {
      if (token.isCancelled || !mounted || !identical(_pending, pending)) {
        return;
      }
      setState(() => _pending = null);
      showToast(
        context,
        "Faylni yuklab bölmadi — qayta urinib köring",
        kind: ToastKind.error,
      );
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
            listenWhen: (p, c) =>
                c.messages.length != p.messages.length ||
                (c.error != null && c.error != p.error),
            // yangi xabar kelganda pastga tushamiz — faqat foydalanuvchi pastda
            // turgan bo'lsa yoki xabar o'ziniki bo'lsa (eski xabarlarni o'qiyotganda sakratmaymiz)
            listener: (context, state) {
              // xato (masalan cheklov) — server matni bilan
              if (state.error != null && state.status == ChatStatus.success) {
                showToast(context, state.error!, kind: ToastKind.error);
              }
              // yangi kelganlar — paydo bo'lish animatsiyasi (birinchi yuklashda emas;
              // bir yöla juda köp kelsa ham — ular tarix kabi, sakramasdan)
              final added = [
                for (final m in state.messages)
                  if (_known.add(m.stableKey)) m.stableKey,
              ];
              final wasSeeded = _seeded;
              if (_seeded && added.length <= 6) added.forEach(_markFresh);
              if (state.status == ChatStatus.success) _seeded = true;
              final nearBottom =
                  !_scrollController.hasClients ||
                  _scrollController.offset < 300;
              final mineLast =
                  state.messages.isNotEmpty && state.messages.last.mine;
              if (nearBottom || mineLast) {
                if (_unseen > 0) setState(() => _unseen = 0);
                WidgetsBinding.instance.addPostFrameCallback(
                  (_) => _scrollToBottom(),
                );
              } else if (wasSeeded && added.isNotEmpty) {
                final keys = added.toSet();
                final incoming = state.messages
                    .where((m) => keys.contains(m.stableKey) && !m.mine)
                    .length;
                if (incoming > 0) setState(() => _unseen += incoming);
              }
            },
            builder: (context, state) {
              final other = state.other ?? widget.initialOther;
              return Column(
                children: [
                  _ChatHeader(
                    other: other,
                    blockedByMe: state.blockedByMe,
                    embedded: widget.embedded,
                  ),
                  if (state.activeContracts.isNotEmpty)
                    _PinnedContractCard(
                      order:
                          state.activeContracts[_contractIndex %
                              state.activeContracts.length],
                      total: state.activeContracts.length,
                      index: _contractIndex % state.activeContracts.length,
                      onCycle: () => setState(
                        () => _contractIndex =
                            (_contractIndex + 1) % state.activeContracts.length,
                      ),
                    ),
                  Expanded(
                    // skelet → xabarlar: yumşoq almaşadi (tarix sakramasdan paydo böladi)
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      switchInCurve: Curves.easeOut,
                      switchOutCurve: Curves.easeIn,
                      child: Builder(
                        key: ValueKey(
                          !routeSettled ||
                              ((state.status == ChatStatus.loading ||
                                      state.status == ChatStatus.initial) &&
                                  state.messages.isEmpty),
                        ),
                        builder: (context) {
                          // sahifa kirib kelayotganda — skelet (ogʼir röyxat animatsiyani qotirmasin)
                          if (!routeSettled ||
                              ((state.status == ChatStatus.loading ||
                                      state.status == ChatStatus.initial) &&
                                  state.messages.isEmpty)) {
                            return Padding(
                              padding: const EdgeInsets.fromLTRB(
                                14,
                                12,
                                14,
                                12,
                              ),
                              // xabarlar pastdan joylashadi (reverse ro'yxat) — skelet ham pastda
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.end,
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
                          if (state.status == ChatStatus.failure &&
                              state.messages.isEmpty) {
                            return Center(
                              child: SingleChildScrollView(
                                child: ErrorState.from(
                                  state.error,
                                  () => context.read<ChatCubit>().load(),
                                ),
                              ),
                            );
                          }
                          if (state.blockedMe && !other.isSupport) {
                            return const Center(
                              child: Padding(
                                padding: EdgeInsets.all(24),
                                child: Text(
                                  'Bu foydalanuvçi sizni bloklagan — xabar yoza olmaysiz.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: AppColors.textMuted),
                                ),
                              ),
                            );
                          }
                          if (state.messages.isEmpty) {
                            return const Center(
                              child: Text(
                                'Xabar yozing — suhbat şu yerdan boşlanadi',
                                style: TextStyle(color: AppColors.textMuted),
                              ),
                            );
                          }
                          // reverse — Telegramdagidek ro'yxat pastdan boshlanadi:
                          // rasm/video yuklanib balandlik o'zgarsa ham oxirgi
                          // xabar doim ko'rinib turadi.
                          return Stack(
                            children: [
                              ListView.builder(
                                controller: _scrollController,
                                reverse: true,
                                padding: const EdgeInsets.fromLTRB(
                                  14,
                                  12,
                                  14,
                                  12,
                                ),
                                itemCount: state.messages.length,
                                itemBuilder: (context, i) {
                                  final m = state
                                      .messages[state.messages.length - 1 - i];
                                  final k = m.stableKey;
                                  return KeyedSubtree(
                                    key: _keyFor(k),
                                    // chapga surib — javob berish (Telegramdagidek)
                                    child: ChatAppear(
                                      animate: _fresh.contains(k),
                                      fromRight: m.mine,
                                      child: SwipeToReply(
                                        enabled:
                                            !m.deleted &&
                                            !m.system &&
                                            !m.isLocal,
                                        onReply: () => context
                                            .read<ChatCubit>()
                                            .setReplyTo(m),
                                        child: FlashHighlight(
                                          flashKey: _flashId == k
                                              ? _flashTick
                                              : null,
                                          child: _MessageBubble(
                                            message: m,
                                            pinnedOrderId:
                                                state.activeContracts.isNotEmpty
                                                ? state.activeContracts.first.id
                                                : null,
                                            onReplyTap: _jumpTo,
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                              // yuqoriga chiqilganda — pastga tushish tugmasi
                              Positioned(
                                right: 14,
                                bottom: 12,
                                child: ChatScrollButtons(
                                  controller: _scrollController,
                                  unread: _unseen,
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
                  if (state.replyTo != null)
                    GestureDetector(
                      onTap: () => _jumpTo(state.replyTo!.id),
                      child: _ReplyBanner(message: state.replyTo!),
                    ),
                  if (!state.blockedMe &&
                      !state.blockedByMe &&
                      _pending != null)
                    PendingAttachmentBar(
                      pending: _pending!,
                      onCancel: _cancelPending,
                    ),
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
                        onPressed: () =>
                            context.read<ChatCubit>().toggleBlock(),
                        child: const Text('Blokdan çiqariş'),
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
  const _ChatHeader({
    required this.other,
    required this.blockedByMe,
    this.embedded = false,
  });
  final ChatOtherUser other;
  final bool blockedByMe;
  final bool embedded;

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
    final online =
        other.lastSeenAt != null &&
        DateTime.now().difference(other.lastSeenAt!).inMinutes < 2;
    // Saytdagi chat-room sarlavhasi: ‹ matnli tugma, 36px avatar, ism,
    // holat nuqtasi va 32x32 chegarali ⋮ tugma; pastda nozik chiziq.
    // suyuq shisha sarlavha (asosiy header bilan bir uslubda)
    // iOS 26 Messages uslubi: orqaga — alohida shisha doira, suhbatdosh — shisha kapsula
    return Padding(
      padding: const EdgeInsets.fromLTRB(kHeaderSide, 6, kHeaderSide, 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (!embedded) ...[
            GlassTap(
              width: 48,
              height: 48,
              strong: true,
              onTap: () => Navigator.of(context).pop(),
              semanticLabel: 'Orqaga',
              child: TIcon(
                TI.arrow_back_ios_new_rounded,
                size: 19,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(width: kHeaderGap),
          ],
          Expanded(
            child: LiquidGlass(
              height: 48,
              borderRadius: BorderRadius.circular(24),
              strong: true,
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: other.isSupport
                          ? null
                          : () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    PublicProfileScreen(userId: other.id),
                              ),
                            ),
                      child: Row(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: WebC.border),
                            ),
                            child: UserAvatar(
                              imageUrl: other.image,
                              initial: _initial(other.name),
                              size: 36,
                            ),
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
                                  style: TextStyle(
                                    color: WebC.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                if (other.isSupport)
                                  Text(
                                    "Qöllab-quvvatlaş",
                                    style: TextStyle(
                                      color: WebC.emerald,
                                      fontSize: 12,
                                    ),
                                  )
                                else
                                  Row(
                                    children: [
                                      Container(
                                        width: 6,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: online
                                              ? WebC.emerald
                                              : WebC.zinc600,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Flexible(
                                        child: Text(
                                          _presence(other.lastSeenAt),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: online
                                                ? WebC.emerald
                                                : WebC.zinc500,
                                            fontSize: 12,
                                          ),
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
                ],
              ),
            ),
          ),
          // ⋮ — alohida şişa tugma (header ikonkalari bilan bir uslubda); bosilganda yonida popup
          if (!other.isSupport) ...[
            const SizedBox(width: kHeaderGap),
            Builder(
              builder: (btnCtx) => GlassTap(
                width: 48,
                height: 48,
                strong: true,
                semanticLabel: 'Amallar',
                onTap: () async {
                  final v = await showAnchoredMenu(
                    btnCtx,
                    items: [
                      const AnchoredMenuItem(
                        id: 'profile',
                        icon: TI.person_outline_rounded,
                        label: 'Profilni köriş',
                      ),
                      const AnchoredMenuItem(
                        id: 'report',
                        icon: TI.flag_outlined,
                        label: 'Şikoyat qiliş',
                      ),
                      AnchoredMenuItem(
                        id: 'block',
                        icon: blockedByMe
                            ? TI.lock_open_rounded
                            : TI.block_rounded,
                        label: blockedByMe ? 'Blokdan çiqariş' : 'Bloklaş',
                      ),
                      const AnchoredMenuItem(
                        id: 'delete',
                        icon: TI.delete_outline_rounded,
                        label: 'Suhbatni öçiriş',
                        danger: true,
                      ),
                    ],
                  );
                  if (v != null && context.mounted) {
                    _onMenuSelect(context, v);
                  }
                },
                child: TIcon(
                  TI.more_horiz_rounded,
                  size: 21,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _onMenuSelect(BuildContext context, String value) async {
    final cubit = context.read<ChatCubit>();
    switch (value) {
      case 'profile':
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => PublicProfileScreen(userId: other.id),
          ),
        );
        break;
      case 'report':
        await _showReportDialog(context);
        break;
      case 'block':
        await cubit.toggleBlock();
        break;
      case 'delete':
        final ok = await confirmDialog(
          context,
          title: "Suhbat öçirilsinmi?",
          message: 'Suhbat ikkala tomondan ham öçiriladi.',
          confirmLabel: "Ha, öçiriş",
        );
        if (ok == true && context.mounted) {
          final done = await cubit.deleteConversation();
          if (done && context.mounted) Navigator.of(context).pop();
        }
        break;
    }
  }
}

Future<void> _showReportDialog(
  BuildContext context, {
  String? messageId,
}) async {
  final cubit = context.read<ChatCubit>();
  final text = TextEditingController();
  await showAppSheet(
    context,
    title: 'Şikoyat qiliş',
    builder: (sheetContext) => Builder(
      builder: (sheetContext) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Nima sodir bölganini yozing (kamida 10 belgi). Şikoyat administratorga yuboriladi.',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13.5,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          AppTextField(label: 'Şikoyat matni', controller: text, maxLines: 4),
          const SizedBox(height: 16),
          ListenableBuilder(
            listenable: text,
            builder: (_, __) => AppDialogButton(
              label: 'Yuboriş',
              danger: true,
              onTap: text.text.trim().length < 10
                  ? null
                  : () async {
                      Navigator.of(sheetContext).pop();
                      final ok = await cubit.report(
                        text.text.trim(),
                        messageId: messageId,
                      );
                      if (ok && context.mounted) {
                        showToast(
                          context,
                          'Şikoyat yuborildi',
                          kind: ToastKind.success,
                        );
                      }
                    },
            ),
          ),
        ],
      ),
    ),
  );
}

String _initial(String name) {
  final clean = name.replaceFirst('@', '').trim();
  return clean.isEmpty ? '?' : clean.substring(0, 1).toUpperCase();
}

class _PinnedContractCard extends StatelessWidget {
  const _PinnedContractCard({
    required this.order,
    required this.total,
    required this.index,
    required this.onCycle,
  });
  final ChatContractOrderRef order;
  final int total;
  final int index;
  final VoidCallback onCycle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
      child: GestureDetector(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => OrderDetailScreen(orderId: order.id),
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: AppColors.indigo.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.indigo.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  const TIcon(
                    TI.push_pin_rounded,
                    size: 16,
                    color: AppColors.indigo,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text.rich(
                          TextSpan(
                            children: [
                              if (order.deadline != null) ...[
                                const WidgetSpan(
                                  alignment: PlaceholderAlignment.middle,
                                  child: Padding(
                                    padding: EdgeInsets.only(right: 3),
                                    child: TIcon(
                                      TI.schedule_rounded,
                                      size: 12,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ),
                                TextSpan(
                                  text: '${shortDateTime(order.deadline!)} · ',
                                ),
                              ],
                              if (order.badgeKind != null)
                                WidgetSpan(
                                  alignment: PlaceholderAlignment.middle,
                                  child: Padding(
                                    padding: const EdgeInsets.only(right: 3),
                                    child: TIcon(
                                      switch (order.badgeKind) {
                                        'contract' => TI.description_outlined,
                                        'disputed' => TI.balance_rounded,
                                        _ => TI.warning_amber_rounded,
                                      },
                                      size: 12,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ),
                              TextSpan(
                                text:
                                    '${order.badge}${total > 1 ? " · ${index + 1}/$total" : ""}',
                              ),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (total > 1)
                    IconButton(
                      onPressed: onCycle,
                      icon: const TIcon(
                        TI.swap_horiz_rounded,
                        size: 18,
                        color: AppColors.textMuted,
                      ),
                    ),
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.indigo.withValues(alpha: 0.22),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      "Işni köriş",
                      style: TextStyle(
                        color: AppColors.indigo,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
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
        border: const Border(
          left: BorderSide(color: AppColors.indigo, width: 3),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Javob berilmoqda',
                  style: TextStyle(
                    color: AppColors.indigo,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  message.deleted
                      ? "öçirilgan xabar"
                      : (message.body.isNotEmpty
                            ? message.body
                            : (message.file?.name ?? 'xabar')),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => context.read<ChatCubit>().setReplyTo(null),
            icon: TIcon(TI.close_rounded, size: 18, color: AppColors.textFaint),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatefulWidget {
  const _MessageBubble({
    required this.message,
    this.pinnedOrderId,
    this.onReplyTap,
  });
  final ChatMessageModel message;

  /// Eski (buyurtmasi yozilmagan) tizim xabarlari uchun zaxira — faol shartnoma
  final String? pinnedOrderId;

  /// Iqtibos (javob berilgan xabar) bosilganda — o'sha xabarga o'tish.
  final void Function(String messageId)? onReplyTap;

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble> {
  /// Popup xabarni o'z joyida «ko'tarishi» uchun — pufakcha o'lchami va joyi.
  final _bubbleKey = GlobalKey();

  ChatMessageModel get message => widget.message;
  String? get pinnedOrderId => widget.pinnedOrderId;
  void Function(String messageId)? get onReplyTap => widget.onReplyTap;

  Future<void> _openMenu(BuildContext context, Widget preview) async {
    if (message.deleted) return;
    final cubit = context.read<ChatCubit>();
    if (message.isLocal) {
      if (message.status != ChatSendStatus.failed) return;
      showAppSheet(
        context,
        title: 'Xabar yuborilmadi',
        builder: (ctx) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppSheetAction(
              icon: TI.refresh_rounded,
              label: 'Qayta yuboriş',
              onTap: () {
                Navigator.of(ctx).pop();
                cubit.retry(message.clientId!);
              },
            ),
            AppSheetAction(
              icon: TI.delete_outline_rounded,
              label: 'Öçiriş',
              danger: true,
              onTap: () {
                Navigator.of(ctx).pop();
                cubit.discard(message.clientId!);
              },
            ),
          ],
        ),
      );
      return;
    }
    // «Tayyorr's Family»dagidek: xira fon, xabar o'z joyida, tepada 10 ta reaksiya, pastda amallar
    final box = _bubbleKey.currentContext?.findRenderObject();
    if (box is! RenderBox || !box.attached) return;
    final rect = box.localToGlobal(Offset.zero) & box.size;
    final m = message;
    final v = await showFamilyPopup(
      context,
      rect: rect,
      preview: SizedBox(width: rect.width, child: preview),
      alignRight: m.mine,
      myReaction: m.reactions
          .where((r) => r.mine)
          .map((r) => r.emoji)
          .firstOrNull,
      seen: 0,
      reactionsCount: 0,
      showInfo: false,
      actions: [
        const FamilyPopupAction('reply', TI.reply_rounded, 'Javob beriş'),
        if (m.body.isNotEmpty)
          const FamilyPopupAction('copy', TI.copy_rounded, 'Nusxa oliş'),
        if (m.file != null)
          FamilyPopupAction(
            'save',
            TI.download_rounded,
            m.file!.isImage || m.file!.isVideo
                ? 'Galereyaga saqlaş'
                : 'Yuklab oliş',
          ),
        if (m.mine) ...[
          const FamilyPopupAction('edit', TI.edit_outlined, 'Tahrirlaş'),
          const FamilyPopupAction(
            'delete',
            TI.delete_outline_rounded,
            'Öçiriş',
            danger: true,
          ),
        ] else
          const FamilyPopupAction(
            'report',
            TI.flag_outlined,
            'Şikoyat qiliş',
            danger: true,
          ),
      ],
    );
    if (v == null || !mounted || !context.mounted) return;
    if (v.startsWith('emoji:')) {
      cubit.react(m.id, v.substring(6));
      return;
    }
    switch (v) {
      case 'reply':
        cubit.setReplyTo(m);
      case 'copy':
        Clipboard.setData(ClipboardData(text: m.body));
        showToast(context, 'Nusxalandi', kind: ToastKind.success);
      case 'save':
        saveChatFile(context, m.file!, m.stableKey);
      case 'edit':
        _showEditSheet(context, cubit, m);
      case 'delete':
        final ok = await confirmDialog(
          context,
          title: "Öçirilsinmi?",
          message: "Xabar ikkala tomondan ham öçiriladi.",
          confirmLabel: "Ha, öçiriş",
          icon: TI.delete_outline_rounded,
        );
        if (ok == true) cubit.deleteMessage(m.id);
      case 'report':
        if (context.mounted) _showReportDialog(context, messageId: m.id);
    }
  }

  void _showEditSheet(
    BuildContext context,
    ChatCubit cubit,
    ChatMessageModel message,
  ) {
    final controller = TextEditingController(text: message.body);
    showAppSheet(
      context,
      title: 'Xabarni tahrirlaş',
      builder: (sheetContext) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppTextField(label: 'Xabar', controller: controller, maxLines: 4),
          const SizedBox(height: 16),
          AppDialogButton(
            label: 'Saqlaş',
            onTap: () {
              final text = controller.text.trim();
              if (text.isEmpty) return;
              Navigator.of(sheetContext).pop();
              cubit.editMessage(message.id, text);
            },
          ),
        ],
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
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.8,
          ),
          decoration: BoxDecoration(
            color: mine
                ? AppColors.indigo.withValues(alpha: 0.85)
                : AppColors.tint(0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                message.body,
                style: TextStyle(
                  color: bubbleTextColor,
                  fontSize: 13.5,
                  height: 1.4,
                ),
              ),
              if ((message.orderId ?? pinnedOrderId) != null) ...[
                const SizedBox(height: 8),
                Divider(
                  color: mine ? Colors.white24 : AppColors.cardBorder,
                  height: 1,
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => OrderDetailScreen(
                        orderId: (message.orderId ?? pinnedOrderId)!,
                      ),
                    ),
                  ),
                  child: Text(
                    'Buyurtmani köriş ›',
                    style: TextStyle(
                      color: bubbleTextColor,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    // Pufakcha eni 86% gacha, 16px burchak, vaqt öng tomonda. Amallar (reaksiya, javob, nusxa...)
    // — pufakçani bosganda / bosib turganda çiqadigan popupda; öngga surilsa — javob.
    final timeColor = mine ? const Color(0xFFC7D2FE) : WebC.zinc500;
    final bubbleBody = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: mine ? const Color(0xFF4F39F6) : WebC.fill5,
        borderRadius: BorderRadius.circular(16),
        border: message.status == ChatSendStatus.failed
            ? Border.all(color: const Color(0xFFF43F5E), width: 1.5)
            : (mine ? null : Border.all(color: WebC.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (message.replyTo != null)
            _ReplyQuote(
              reply: message.replyTo!,
              mine: mine,
              onTap: onReplyTap == null
                  ? null
                  : () => onReplyTap!(message.replyTo!.id),
            ),
          if (message.file != null)
            ChatAttachment(
              file: message.file!,
              cacheKey: message.stableKey,
              mine: mine,
            ),
          if (!message.deleted && message.body.isNotEmpty) ...[
            if (message.file != null) const SizedBox(height: 6),
            LinkText(
              message.body,
              style: TextStyle(
                color: mine ? Colors.white : WebC.zinc200,
                fontSize: 14,
                height: 1.45,
              ),
              linkColor: mine ? Colors.white : WebC.indigoSoft,
            ),
          ],
          if (message.action != null && !message.deleted) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () => openInternalUrl(context, message.action!.url),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: mine
                      ? Colors.white.withValues(alpha: 0.15)
                      : AppColors.indigo.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TIcon(
                      TI.account_balance_wallet_outlined,
                      size: 16,
                      color: mine ? Colors.white : WebC.indigoSoft,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        '${message.action!.label} ›',
                        style: TextStyle(
                          color: mine ? Colors.white : WebC.indigoSoft,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (message.deleted)
            Text(
              "öçirilgan xabar",
              style: TextStyle(
                color: timeColor,
                fontStyle: FontStyle.italic,
                fontSize: 14,
              ),
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
                if (message.status == ChatSendStatus.pending)
                  TIcon(TI.schedule_rounded, size: 13, color: timeColor)
                else if (message.status == ChatSendStatus.failed)
                  const TIcon(
                    TI.error_outline_rounded,
                    size: 13,
                    color: Color(0xFFFDA4AF),
                  )
                else
                  TIcon(
                    message.readAt != null
                        ? TI.done_all_rounded
                        : TI.done_rounded,
                    size: 14,
                    color: message.readAt != null
                        ? const Color(0xFF7DD3FC)
                        : timeColor,
                  ),
              ],
            ],
          ),
        ],
      ),
    );
    // bosish yoki bosib turish — popup (Family'dagidek)
    final bubble = GestureDetector(
      onTap: () => _openMenu(context, bubbleBody),
      onLongPress: () => _openMenu(context, bubbleBody),
      child: KeyedSubtree(key: _bubbleKey, child: bubbleBody),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: mine
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, c) {
              return Row(
                mainAxisAlignment: mine
                    ? MainAxisAlignment.end
                    : MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: c.maxWidth * 0.86),
                    child: IntrinsicWidth(child: bubble),
                  ),
                ],
              );
            },
          ),
          if (message.status == ChatSendStatus.failed)
            Padding(
              padding: const EdgeInsets.only(top: 5),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const TIcon(
                    TI.error_outline_rounded,
                    size: 14,
                    color: Color(0xFFF43F5E),
                  ),
                  const SizedBox(width: 4),
                  const Text(
                    'Yuborilmadi',
                    style: TextStyle(
                      color: Color(0xFFF43F5E),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 10),
                  _RetryPill(
                    label: 'Qayta yuboriş',
                    icon: TI.refresh_rounded,
                    onTap: () =>
                        context.read<ChatCubit>().retry(message.clientId!),
                  ),
                  const SizedBox(width: 6),
                  _RetryPill(
                    label: 'Öçiriş',
                    icon: TI.delete_outline_rounded,
                    danger: true,
                    onTap: () =>
                        context.read<ChatCubit>().discard(message.clientId!),
                  ),
                ],
              ),
            ),
          if (message.reactions.isNotEmpty && !message.deleted)
            Padding(
              padding: EdgeInsets.only(
                top: 4,
                left: mine ? 0 : 4,
                right: mine ? 4 : 0,
              ),
              child: _ReactionChips(
                reactions: message.reactions,
                alignRight: mine,
                onTap: (e) => context.read<ChatCubit>().react(message.id, e),
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
          border: Border(
            left: BorderSide(
              color: mine ? const Color(0xFFA5B4FC) : WebC.indigo,
              width: 2,
            ),
          ),
        ),
        child: Text(
          reply.deleted ? "öçirilgan xabar" : reply.text,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: mine ? const Color(0xFFC7D2FE) : WebC.zinc400,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

/// Pufakcha ostidagi reaksiyalar (Family'dagidek): emoji + son; meniki — ajratilgan. Bosilsa — almashtiriladi.
class _ReactionChips extends StatelessWidget {
  const _ReactionChips({
    required this.reactions,
    required this.onTap,
    this.alignRight = false,
  });
  final List<MessageReaction> reactions;
  final void Function(String emoji) onTap;
  final bool alignRight;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      alignment: alignRight ? WrapAlignment.end : WrapAlignment.start,
      children: [
        for (final r in reactions)
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              onTap(r.emoji);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: r.mine
                    ? const Color(0xFF6366F1).withValues(alpha: 0.22)
                    : AppColors.tint(0.06),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(
                  color: r.mine
                      ? const Color(0xFF818CF8)
                      : AppColors.cardBorder,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ReactionEmoji(r.emoji, size: 15),
                  const SizedBox(width: 4),
                  Text(
                    '${r.count}',
                    style: TextStyle(
                      color: r.mine ? WebC.indigoSoft : AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _RetryPill extends StatelessWidget {
  const _RetryPill({
    required this.label,
    required this.icon,
    required this.onTap,
    this.danger = false,
  });
  final String label;
  final TIData icon;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final c = danger ? const Color(0xFFF43F5E) : WebC.indigoSoft;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: c.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            TIcon(icon, size: 13, color: c),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: c,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
