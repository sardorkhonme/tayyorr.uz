import 'package:tayyorr_app/core/ui/ticons.dart';
import '../../messages/presentation/chat_media.dart';
import '../../../core/app_config.dart';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/ui/app_dialogs.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/date_time_picker.dart';
import '../../../widgets/mascot.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../auth/data/user_model.dart';
import '../../dashboard/data/order_model.dart';
import '../../dashboard/presentation/order_list_widgets.dart';
import '../../home/section_cubit.dart';
import '../../messages/data/message_model.dart';
import '../../messages/data/messages_repository.dart';
import '../../messages/presentation/chat_screen.dart';
import '../../offers/data/offer_model.dart' show kOfferStatusLabel;
import '../../public_profile/presentation/public_profile_screen.dart';
import '../cubit/order_detail_cubit.dart';
import '../data/order_detail_model.dart';
import '../data/order_detail_repository.dart';
import 'contract_panel.dart';
import 'detail_ui.dart';
import '../../../widgets/flash_status.dart';

/// Ariza uchun minimal star — admin belgilaydi (server /mobile/config).
int get _minOfferStars => AppConfig.instance.minOfferStars;

/// Buyurtma sahifasi. Tartib: sarlavha va holat → asosiy faktlar (byudjet, muddat) →
/// tavsif → fayllar → ishtirokchilar → takliflar / shartnoma / amallar → boshqaruv.
class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.orderId});
  final String orderId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => OrderDetailCubit(OrderDetailRepository(), orderId)..load(),
      child: const _OrderDetailView(),
    );
  }
}

class _OrderDetailView extends StatelessWidget {
  const _OrderDetailView();

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthBloc>().state.user;
    return BlocBuilder<OrderDetailCubit, OrderDetailState>(
      builder: (context, state) {
        final order = state.order;
        if (order == null) {
          if (state.status == OrderDetailStatus.failure) {
            return WebPage(
              children: [
                ErrorState.from(
                  state.error,
                  () => context.read<OrderDetailCubit>().load(),
                  statusCode: state.errorCode,
                  notFoundTitle: 'Buyurtma topilmadi',
                  notFoundMessage: "U öçirilgan yoki sizga körinmaydi.",
                  notFoundActionLabel: 'Ortga',
                  notFoundAction: () => Navigator.of(context).maybePop(),
                ),
              ],
            );
          }
          // haqiqiy tuzilma: sarlavha kartasi, 2 ta fakt, tavsif, ishtirokchi
          return const WebPage(
            gap: 16,
            children: [
              WebCard(
                padding: EdgeInsets.all(kDetailPad),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        SBar(width: 90, height: 24, borderRadius: 99),
                        SizedBox(width: 8),
                        SBar(width: 70, height: 24, borderRadius: 99),
                      ],
                    ),
                    SizedBox(height: 12),
                    SBar(height: 22),
                    SizedBox(height: 6),
                    SBar(width: 180, height: 22),
                    SizedBox(height: 12),
                    SBar(width: 120, height: 12),
                  ],
                ),
              ),
              Row(
                children: [
                  Expanded(child: SBlock(height: 72)),
                  SizedBox(width: 12),
                  Expanded(child: SBlock(height: 72)),
                ],
              ),
              WebCard(
                padding: EdgeInsets.all(kDetailPad),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SBar(width: 80, height: 16),
                    SizedBox(height: 14),
                    SBar(height: 13),
                    SizedBox(height: 7),
                    SBar(height: 13),
                    SizedBox(height: 7),
                    SBar(width: 200, height: 13),
                  ],
                ),
              ),
              WebCard(
                padding: EdgeInsets.all(kDetailPad),
                child: Row(
                  children: [
                    SCircle(size: 44),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SBar(width: 140, height: 15),
                          SizedBox(height: 6),
                          SBar(width: 80, height: 11),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        }
        return WebPage(
          onRefresh: () => context.read<OrderDetailCubit>().load(),
          gap: 16,
          children: _sections(context, state, order, me),
        );
      },
    );
  }

  List<Widget> _sections(
    BuildContext context,
    OrderDetailState state,
    OrderDetailModel o,
    UserModel? me,
  ) {
    final meId = me?.id ?? '';
    final isOrderer = o.orderer.id == meId;
    final isPreparer = me?.isPreparer ?? false;
    final isAssigned = o.preparer?.id == meId;
    // boshqa buyurtmachi lentadan ochgan — faqat ko'rish
    final viewOnly = !isOrderer && !isPreparer;
    // imzolangan faol shartnoma bor — buyurtmani o'chirib bo'lmaydi
    final locked =
        (o.status == 'IN_PROGRESS' || o.status == 'DELIVERED') &&
        o.contracts.any((c) => c.status == 'ACCEPTED');

    final people = <(OrderPartyModel, String)>[
      if (!isOrderer) (o.orderer, 'Buyurtmaçi'),
      if (o.preparer != null && !isAssigned) (o.preparer!, 'Tayyorlovçi'),
    ];

    return [
      if (o.deleted) _DeletedNotice(order: o),
      _TitleCard(order: o, isOrderer: isOrderer),
      _Facts(order: o),
      if (viewOnly && !o.deleted)
        const InfoNote(
          icon: TI.visibility_outlined,
          title: 'Faqat köriş uçun',
          text:
              "Bu boşqa foydalanuvçining buyurtmasi. Taklifni faqat tayyorlovçilar yuboradi — "
              "özingizga buyurtma kerak bölsa, «Buyurtmalarim» bölimida yarating.",
        ),
      DetailCard(
        title: 'Tavsif',
        icon: TI.description_outlined,
        child: SelectableText(
          o.description,
          style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.5),
        ),
      ),
      if (o.files.isNotEmpty) _Files(files: o.files),
      if (people.isNotEmpty)
        DetailCard(
          title: people.length > 1 ? 'Iştirokçilar' : people.first.$2,
          icon: TI.person_outline_rounded,
          child: Column(
            children: [
              for (var i = 0; i < people.length; i++) ...[
                if (i > 0)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Container(height: 1, color: WebC.border),
                  ),
                _PersonRow(
                  person: people[i].$1,
                  role: people.length > 1 ? people[i].$2 : null,
                ),
              ],
            ],
          ),
        ),
      if (!o.deleted && !viewOnly)
        _OrderActions(
          order: o,
          state: state,
          meId: meId,
          isOrderer: isOrderer,
          isPreparer: isPreparer,
          isAssigned: isAssigned,
        ),
      if (isOrderer && !o.deleted && (o.status == 'OPEN' || !locked))
        _ManageCard(canCancel: o.status == 'OPEN', canDelete: !locked),
    ];
  }
}

/// Sarlavha kartasi: tur va holat yorliqlari, sarlavha, e'lon qilingan vaqt.
class _TitleCard extends StatelessWidget {
  const _TitleCard({required this.order, required this.isOrderer});
  final OrderDetailModel order;
  final bool isOrderer;

  @override
  Widget build(BuildContext context) {
    final o = order;
    return WebCard(
      padding: const EdgeInsets.all(kDetailPad),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 24,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: WebC.indigoFill,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  kOrderTypeLabel[o.type] ?? o.type,
                  maxLines: 1,
                  style: TextStyle(
                    color: WebC.indigo,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OrderStatusChip(status: o.status, deleted: o.deleted),
            ],
          ),
          const SizedBox(height: kDetailGap),
          SelectableText(
            o.title,
            style: TextStyle(
              color: WebC.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.4,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "${isOrderer ? 'Siz eʼlon qildingiz' : 'Eʼlon qilindi'} · ${timeAgo(o.createdAt)}",
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: WebC.zinc500, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

/// Asosiy faktlar: byudjet va muddat — yonma-yon, bir xil balandlikda.
class _Facts extends StatelessWidget {
  const _Facts({required this.order});
  final OrderDetailModel order;

  @override
  Widget build(BuildContext context) {
    final budget = order.budget ?? 0;
    return Row(
      children: [
        Expanded(
          child: FactTile(
            icon: TI.payments_outlined,
            label: 'Byudjet',
            value: budget > 0 ? "${groupDigits(budget)} söm" : 'Kelişiladi',
            muted: budget <= 0,
          ),
        ),
        const SizedBox(width: kDetailGap),
        Expanded(
          child: FactTile(
            icon: TI.event_rounded,
            label: 'Muddat',
            value: order.deadline != null
                ? shortDateTime(order.deadline!)
                : 'Belgilanmagan',
            muted: order.deadline == null,
          ),
        ),
      ],
    );
  }
}

class _DeletedNotice extends StatelessWidget {
  const _DeletedNotice({required this.order});
  final OrderDetailModel order;

  @override
  Widget build(BuildContext context) {
    final by = order.deletedByRole == 'ADMIN'
        ? 'Administrator tomonidan'
        : 'Buyurtmaçi tomonidan';
    final lines = [
      '$by${order.deletedAt != null ? ' · ${shortDateTime(order.deletedAt!)}' : ''}.',
      if ((order.deleteReason ?? '').isNotEmpty)
        'Sabab: ${order.deleteReason}.',
      "U faqat sizga körinadi, boşqalarga emas.",
    ];
    return InfoNote(
      icon: TI.delete_outline_rounded,
      color: WebC.red,
      title: "Bu buyurtma öçirilgan",
      text: lines.join('\n'),
    );
  }
}

/// Ishtirokchi qatori: avatar, ism, onlayn holat; bosilganda profil ochiladi.
class _PersonRow extends StatelessWidget {
  const _PersonRow({required this.person, this.role});
  final OrderPartyModel person;
  final String? role;

  @override
  Widget build(BuildContext context) {
    final img = person.image ?? '';
    final name = person.displayName;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PublicProfileScreen(userId: person.id),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: WebC.fill10,
            ),
            foregroundDecoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: WebC.border),
            ),
            alignment: Alignment.center,
            child: img.isEmpty
                ? Text(
                    name.replaceAll('@', '').characters.first.toUpperCase(),
                    style: TextStyle(
                      color: WebC.zinc300,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  )
                : Image.network(
                    img,
                    width: 44,
                    height: 44,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const SizedBox(),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: WebC.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: person.online
                            ? const Color(0xFF34D399)
                            : const Color(0xFF71717A),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        [?role, person.presence ?? 'oflayn'].join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: person.online ? WebC.emerald : WebC.zinc500,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          TIcon(TI.chevron_right_rounded, size: 18, color: WebC.zinc500),
        ],
      ),
    );
  }
}

class _Files extends StatelessWidget {
  const _Files({required this.files});
  final List<OrderFileModel> files;

  @override
  Widget build(BuildContext context) {
    return DetailCard(
      title: 'Fayllar',
      icon: TI.attach_file_rounded,
      trailing: Text(
        '${files.length} ta',
        style: TextStyle(color: WebC.zinc500, fontSize: 13),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < files.length; i++) ...[
            if (i > 0) const SizedBox(height: 8),
            files[i].url != null
                ? ChatAttachment(
                    file: ChatFileModel(
                      name: '${files[i].kind}${_extFor(files[i].mimeType)}',
                      type: files[i].mimeType ?? 'application/octet-stream',
                      size: files[i].size,
                      url: files[i].url!,
                    ),
                    cacheKey: 'order-file-${files[i].id}',
                    mine: false,
                  )
                : Row(
                    children: [
                      TIcon(TI.lock_rounded, size: 16, color: WebC.zinc500),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "${files[i].kind} — faqat iştirokçilarga oçiq",
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: WebC.zinc500, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
          ],
        ],
      ),
    );
  }
}

/// Buyurtmachi: bekor qilish (ochiq bo'lsa) va o'chirish — sahifa oxirida, bir qatorda.
class _ManageCard extends StatelessWidget {
  const _ManageCard({required this.canCancel, required this.canDelete});
  final bool canCancel;
  final bool canDelete;

  @override
  Widget build(BuildContext context) {
    final busy = context.select<OrderDetailCubit, bool>((c) => c.state.busy);
    final cubit = context.read<OrderDetailCubit>();
    return DetailCard(
      title: 'Buyurtmani boşqariş',
      icon: TI.edit_note_rounded,
      child: ActionGroup(
        children: [
          if (canCancel)
            ActionBtn(
              label: 'Bekor qiliş',
              icon: TI.highlight_off_rounded,
              kind: ActionKind.ghost,
              onPressed: busy
                  ? null
                  : () async {
                      final ok = await confirmDialog(
                        context,
                        title: 'Buyurtma bekor qilinsinmi?',
                        message:
                            "Yuborilgan şartnoma bölsa, bloklangan mablağ sizga qaytadi.",
                        confirmLabel: 'Ha',
                        cancelLabel: "Yöq",
                      );
                      if (ok == true) cubit.setStatus('CANCELLED');
                    },
            ),
          if (canDelete)
            ActionBtn(
              label: "Öçiriş",
              icon: TI.delete_outline_rounded,
              kind: ActionKind.danger,
              onPressed: busy
                  ? null
                  : () async {
                      final ok = await confirmDialog(
                        context,
                        title: "Buyurtma öçirilsinmi?",
                        message:
                            "Boşqalarga körinmaydi, lekin sizda «öçirilgan» holatida qoladi. Faol şartnomadagi mablağ qaytariladi.",
                        confirmLabel: "Öçiriş",
                        cancelLabel: 'Bekor',
                      );
                      if (ok == true && context.mounted) cubit.deleteOrder();
                    },
            ),
        ],
      ),
    );
  }
}

/// Rol va holatga qarab: shartnoma, taklif formasi, navbat, takliflar, baho, shartnoma paneli.
class _OrderActions extends StatefulWidget {
  const _OrderActions({
    required this.order,
    required this.state,
    required this.meId,
    required this.isOrderer,
    required this.isPreparer,
    required this.isAssigned,
  });

  final OrderDetailModel order;
  final OrderDetailState state;
  final String meId;
  final bool isOrderer;
  final bool isPreparer;
  final bool isAssigned;

  @override
  State<_OrderActions> createState() => _OrderActionsState();
}

class _OrderActionsState extends State<_OrderActions> {
  late final _price = TextEditingController(
    text: _myOffer?.price.toString() ?? '',
  );
  late final _message = TextEditingController(text: _myOffer?.message ?? '');
  final _offerStars = TextEditingController(text: '$_minOfferStars');
  final _boost = TextEditingController();
  final _cAmount = TextEditingController();
  final _cNote = TextEditingController();
  DateTime? _cDeadline;
  final _reviewComment = TextEditingController();
  int _reviewStars = 0;
  String? _contractFor;
  final _localErrF = FlashValue<String>();
  String? get _localErr => _localErrF.value;
  set _localErr(String? v) => _localErrF.value = v;

  OrderDetailModel get o => widget.order;
  OrderOfferModel? get _myOffer {
    for (final x in o.offers) {
      if (x.preparer.id == widget.meId) return x;
    }
    return null;
  }

  ContractModel? _contract(String status) {
    for (final c in o.contracts) {
      if (c.status == status) return c;
    }
    return null;
  }

  @override
  void dispose() {
    for (final c in [
      _price,
      _message,
      _offerStars,
      _boost,
      _cAmount,
      _cNote,
      _reviewComment,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  OrderDetailCubit get _cubit => context.read<OrderDetailCubit>();

  /// Çat sahifasi DARHOL oçiladi (skelet bilan) — suhbat uning içida yaratiladi / topiladi.
  void _startChat(OrderPartyModel user) {
    setState(() => _localErr = null);
    final other = ChatOtherUser(
      id: user.id,
      name: (user.name ?? '').isNotEmpty
          ? user.name!
          : (user.login ?? 'Foydalanuvçi'),
      login: user.login,
      image: user.image,
      isSupport: false,
    );
    final orderId = o.id;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PendingChatScreen(
          other: other,
          resolve: () async => (
            id: await MessagesRepository().startConversation(
              user.id,
              orderId: orderId,
            ),
            other: other,
          ),
        ),
      ),
    );
  }

  void _report(String suspectId) {
    showWebDialog(
      context,
      builder: (_) => _ReportForm(suspectId: suspectId, orderId: o.id),
    );
  }

  @override
  Widget build(BuildContext context) {
    final busy = widget.state.busy;
    final status = o.status;
    final sent = _contract('SENT');
    final accepted = _contract('ACCEPTED');
    final incoming = widget.isPreparer && sent?.preparerId == widget.meId
        ? sent
        : null;
    final err = _localErr ?? widget.state.error;
    final myOffer = _myOffer;

    final children = <Widget>[
      // Imzolangan shartnoma: topshirish / yakunlash / qayta ishlash / bekor qilish so'rovi
      if (accepted != null &&
          (widget.isOrderer || widget.isAssigned) &&
          (status == 'IN_PROGRESS' || status == 'DELIVERED'))
        ContractPanel(
          order: o,
          contract: accepted,
          meId: widget.meId,
          isOrderer: widget.isOrderer,
          busy: busy,
        ),

      if (widget.isAssigned)
        ActionBtn(
          label: 'Buyurtmaçiga yoziş',
          icon: TI.chat_bubble_outline_rounded,
          kind: ActionKind.ghost,
          onPressed: busy ? null : () => _startChat(o.orderer),
        ),

      // Tayyorlovchiga kelgan shartnoma
      if (incoming != null)
        DetailCard(
          title: 'Sizga şartnoma yuborildi',
          icon: TI.description_outlined,
          tint: const Color(0xFF6366F1),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              KeyValueRow(
                label: 'Summa',
                value: "${groupDigits(incoming.amount)} söm",
              ),
              if (incoming.deadline != null)
                KeyValueRow(
                  label: 'Topşiriş muddati',
                  value: shortDateTime(incoming.deadline!),
                ),
              if ((incoming.note ?? '').isNotEmpty)
                KeyValueRow(label: 'Izoh', value: incoming.note!),
              const SizedBox(height: 8),
              const InfoNote(
                text:
                    "Qabul qilgandan keyin şartnomani faqat ikki tomon roziligi (yoki admin qarori) bilan "
                    "bekor qiliş mumkin. Muddatgaça iş topşirilmasa — şartnoma bekor böladi.",
              ),
              const SizedBox(height: kDetailGap),
              ActionGroup(
                children: [
                  ActionBtn(
                    label: 'Rad etiş',
                    kind: ActionKind.ghost,
                    onPressed: busy
                        ? null
                        : () => _cubit.respondToContract(
                            incoming.id,
                            action: 'DECLINE',
                          ),
                  ),
                  ActionBtn(
                    label: 'Qabul qiliş',
                    icon: TI.check_rounded,
                    onPressed: busy
                        ? null
                        : () => _cubit.respondToContract(
                            incoming.id,
                            action: 'ACCEPT',
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),

      // Buyurtmachi: yuborilgan shartnoma holati
      if (widget.isOrderer && sent != null)
        DetailCard(
          title: 'Şartnoma yuborildi',
          icon: TI.description_outlined,
          tint: const Color(0xFF6366F1),
          trailing: Text(
            'javob kutilmoqda',
            style: TextStyle(color: WebC.zinc400, fontSize: 12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              KeyValueRow(label: 'Tayyorlovçi', value: sent.preparerName),
              KeyValueRow(
                label: 'Summa',
                value: "${groupDigits(sent.amount)} söm",
              ),
              if (sent.deadline != null)
                KeyValueRow(
                  label: 'Topşiriş muddati',
                  value: shortDateTime(sent.deadline!),
                ),
              const SizedBox(height: kDetailGap),
              ActionBtn(
                label: 'Şartnomani bekor qiliş',
                kind: ActionKind.ghost,
                onPressed: busy
                    ? null
                    : () => _cubit.respondToContract(sent.id, action: 'CANCEL'),
              ),
            ],
          ),
        ),

      // Tayyorlovchi: taklif yuborish / yangilash
      if (widget.isPreparer && !widget.isAssigned && status == 'OPEN')
        _offerForm(myOffer, busy),

      // Navbat (va uning ostida — öz taklifini star bilan navbatda kötariş)
      if (widget.isPreparer &&
          !widget.isOrderer &&
          status == 'OPEN' &&
          (o.queue.isNotEmpty || (myOffer != null && !widget.isAssigned)))
        _queue(widget.isAssigned ? null : myOffer, busy),

      // Buyurtmachi: takliflar
      if (widget.isOrderer) ..._offers(busy, status, sent),

      // Baholash (buyurtmachi)
      if (widget.isOrderer && status == 'DONE')
        o.review != null
            ? DetailCard(
                title: 'Sizning bahoyingiz',
                icon: TI.star_outline_rounded,
                child: _reviewView(o.review!),
              )
            : _reviewForm(busy),

      // Tayyorlovchiga qo'yilgan baho
      if (widget.isAssigned && status == 'DONE')
        DetailCard(
          title: "Sizga qöyilgan baho",
          icon: TI.star_outline_rounded,
          child: o.review != null
              ? _reviewView(o.review!)
              : Text(
                  "Buyurtmaçi hali baho qöymagan.",
                  style: TextStyle(color: WebC.zinc500, fontSize: 14),
                ),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FlashStatus(
          message: err,
          trigger: _localErrF.seq,
          builder: (_, m) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: InfoNote(
              icon: TI.error_outline_rounded,
              color: WebC.red,
              text: m,
            ),
          ),
        ),
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const SizedBox(height: 16),
          children[i],
        ],
      ],
    );
  }

  Widget _reviewView(OrderReviewModel r) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      WebStars(value: r.stars.toDouble(), size: 16),
      const SizedBox(height: 8),
      Text(
        (r.comment ?? '').isNotEmpty ? '«${r.comment}»' : 'Şarh qoldirilmagan.',
        style: TextStyle(
          color: (r.comment ?? '').isNotEmpty ? WebC.zinc300 : WebC.zinc500,
          fontSize: 14,
          height: 1.45,
        ),
      ),
    ],
  );

  Widget _link(String text) => GestureDetector(
    onTap: () => goToSection(context, AppSection.wallet),
    child: Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Text(
        text,
        style: TextStyle(
          color: WebC.indigo,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );

  Widget _field(String label, Widget input) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: WebC.zinc400,
            fontSize: 12.8,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      input,
    ],
  );

  Widget _offerForm(OrderOfferModel? myOffer, bool busy) {
    final stars = int.tryParse(_offerStars.text) ?? _minOfferStars;
    final sendStars = stars > 0 ? stars : _minOfferStars;
    return DetailCard(
      title: myOffer != null ? 'Mening taklifim' : 'Taklif yuboriş',
      icon: TI.back_hand_outlined,
      trailing: myOffer != null ? _OfferBadge(status: myOffer.status) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _field(
                  "Narx (söm)",
                  WebInput(
                    controller: _price,
                    keyboardType: TextInputType.number,
                  ),
                ),
              ),
              if (myOffer == null) ...[
                const SizedBox(width: kDetailGap),
                Expanded(
                  child: _field(
                    'Star (kamida $_minOfferStars)',
                    WebInput(
                      controller: _offerStars,
                      keyboardType: TextInputType.number,
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: kDetailGap),
          _field(
            'Xabar (ixtiyoriy)',
            WebInput(controller: _message, maxLines: 3, minLines: 3),
          ),
          if (myOffer == null) ...[
            const SizedBox(height: kDetailGap),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(
                      children: [
                        const WidgetSpan(
                          alignment: PlaceholderAlignment.middle,
                          child: Padding(
                            padding: EdgeInsets.only(right: 6),
                            child: StarGlyph(size: 13),
                          ),
                        ),
                        TextSpan(
                          text:
                              'Navbatda köproq star sarflagan yuqorida turadi. Star balansingizdan '
                              'sarflanadi (kamida $_minOfferStars).',
                        ),
                      ],
                    ),
                    style: TextStyle(
                      color: WebC.zinc300,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                  _link('Hamyondan star sotib oliş →'),
                ],
              ),
            ),
          ],
          const SizedBox(height: kDetailGap),
          ActionBtn(
            label: myOffer != null
                ? 'Taklifni yangilaş'
                : 'Taklif yuboriş · $sendStars',
            leadingWidget: myOffer != null ? null : const StarGlyph(size: 16),
            onPressed: busy
                ? null
                : () {
                    final price = int.tryParse(_price.text.trim());
                    if (price == null || price <= 0) {
                      setState(() => _localErr = 'Narxni kiriting');
                      return;
                    }
                    setState(() => _localErr = null);
                    _cubit.submitOffer(
                      price: price,
                      message: _message.text.trim().isEmpty
                          ? null
                          : _message.text.trim(),
                      stars: myOffer == null ? sendStars : null,
                    );
                  },
          ),
        ],
      ),
    );
  }

  Widget _queue(OrderOfferModel? myOffer, bool busy) {
    return DetailCard(
      title: 'Navbat',
      icon: TI.people_alt_rounded,
      trailing: Text(
        '${o.queue.length} ta',
        style: TextStyle(color: WebC.zinc500, fontSize: 13),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Köproq star sarflagan yuqorida turadi.",
            style: TextStyle(color: WebC.zinc500, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: kDetailGap),
          for (var i = 0; i < o.queue.length; i++) ...[
            if (i > 0) const SizedBox(height: 8),
            _queueRow(o.queue[i]),
          ],
          if (myOffer != null) ...[
            const SizedBox(height: 16),
            Container(height: 1, color: WebC.border),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Navbatda kötariliş',
                    style: TextStyle(
                      color: WebC.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  'sarflangan: ${myOffer.starsSpent} ',
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
                const StarGlyph(size: 12),
              ],
            ),
            const SizedBox(height: 8),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: WebInput(
                      controller: _boost,
                      hint: 'Star soni',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ActionBtn(
                      label: 'Kötariş',
                      icon: TI.rocket_launch_outlined,
                      kind: ActionKind.ghost,
                      height: null,
                      onPressed: busy
                          ? null
                          : () {
                              final n = int.tryParse(_boost.text.trim()) ?? 0;
                              if (n <= 0) {
                                setState(
                                  () => _localErr = 'Star sonini kiriting',
                                );
                                return;
                              }
                              setState(() => _localErr = null);
                              _cubit.boostOffer(n).then((ok) {
                                if (ok) _boost.clear();
                              });
                            },
                    ),
                  ),
                ],
              ),
            ),
            _link('Star sotib oliş →'),
          ],
        ],
      ),
    );
  }

  Widget _queueRow(OfferQueueEntry q) => Container(
    height: 44,
    padding: const EdgeInsets.symmetric(horizontal: 12),
    decoration: BoxDecoration(
      color: q.mine
          ? const Color(0xFF6366F1).withValues(alpha: 0.10)
          : AppColors.tint(0.03),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(
        color: q.mine
            ? const Color(0xFF818CF8).withValues(alpha: 0.30)
            : Colors.transparent,
      ),
    ),
    child: Row(
      children: [
        SizedBox(
          width: 32,
          child: Text(
            '#${q.position}',
            style: TextStyle(
              color: WebC.zinc500,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(
          child: Row(
            children: [
              Flexible(
                child: Text(
                  q.visible,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: WebC.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (q.hiddenLen > 0)
                ImageFiltered(
                  imageFilter: ImageFilter.blur(sigmaX: 3, sigmaY: 3),
                  child: Text(
                    '•' * q.hiddenLen.clamp(0, 10),
                    style: TextStyle(
                      color: WebC.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              if (q.mine) ...[
                const SizedBox(width: 8),
                Text(
                  '(siz)',
                  style: TextStyle(color: WebC.indigoSoft, fontSize: 12),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${q.starsSpent}',
          style: TextStyle(
            color: WebC.amber,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(width: 2),
        const StarGlyph(size: 12),
      ],
    ),
  );

  /// Takliflar — BITTA karta: ičida ixçam qatorlar (avatar, ism, reyting, narx, holat).
  /// Qator bosilganda — yonida amallar popupi (şartnoma, yoziş, profil, rad etiş, şikoyat).
  List<Widget> _offers(bool busy, String status, ContractModel? sent) {
    return [
      DetailCard(
        title: 'Takliflar',
        icon: TI.local_offer_outlined,
        trailing: Text(
          '${o.offers.length} ta',
          style: TextStyle(color: WebC.zinc500, fontSize: 13),
        ),
        child: o.offers.isEmpty
            ? const MascotState(
                pose: MascotPose.emptyOffers,
                title: "Hozirça taklif yöq",
                message:
                    "Tayyorlovçilar narx taklif qilişi bilan şu yerda körinadi.",
                size: 170,
                fill: false,
                padding: EdgeInsets.fromLTRB(8, 4, 8, 8),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var i = 0; i < o.offers.length; i++) ...[
                    if (i > 0) Container(height: 1, color: WebC.fill5),
                    _offerRow(o.offers[i], busy, status, sent),
                    if (_contractFor == o.offers[i].preparer.id) ...[
                      const SizedBox(height: 4),
                      _contractForm(o.offers[i], busy),
                      const SizedBox(height: kDetailGap),
                    ],
                  ],
                ],
              ),
      ),
    ];
  }

  /// Ixçam taklif qatori (~64px). Bosilganda — amallar popupi.
  Widget _offerRow(
    OrderOfferModel x,
    bool busy,
    String status,
    ContractModel? sent,
  ) {
    final name = (x.preparer.name ?? '').isNotEmpty
        ? x.preparer.name!
        : (x.preparer.login ?? '—');
    final img = x.preparer.image ?? '';
    return Builder(
      builder: (rowCtx) => InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _offerMenu(rowCtx, x, busy, status, sent),
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: WebC.fill10,
                ),
                child: img.isEmpty
                    ? Text(
                        name.characters.first.toUpperCase(),
                        style: TextStyle(
                          color: WebC.zinc300,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      )
                    : Image.network(
                        img,
                        width: 40,
                        height: 40,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const SizedBox(),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: WebC.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        WebStars(value: x.preparerRating ?? 0, size: 11),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            x.preparerRating != null
                                ? '${x.preparerRating!.toStringAsFixed(1)} (${x.preparerRatingCount})'
                                : 'yangi',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: WebC.zinc400, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "${groupDigits(x.price)} söm",
                    style: TextStyle(
                      color: WebC.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  if (x.status != 'PENDING')
                    _OfferBadge(status: x.status, compact: true)
                  else
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${timeAgo(x.createdAt)} · ${x.starsSpent} ',
                          style: TextStyle(color: WebC.zinc500, fontSize: 12),
                        ),
                        const StarGlyph(size: 11),
                      ],
                    ),
                ],
              ),
              const SizedBox(width: 4),
              TIcon(TI.more_horiz_rounded, size: 18, color: WebC.zinc500),
            ],
          ),
        ),
      ),
    );
  }

  /// Taklif amallari — qator yonida çiqadigan popup (blursiz karta).
  Future<void> _offerMenu(
    BuildContext anchor,
    OrderOfferModel x,
    bool busy,
    String status,
    ContractModel? sent,
  ) async {
    final open = _contractFor == x.preparer.id;
    final canContract =
        status == 'OPEN' && x.status == 'PENDING' && sent == null;
    final hasNote =
        (x.message ?? '').isNotEmpty || (x.preparerAbout ?? '').isNotEmpty;
    final v = await showAnchoredMenu(
      anchor,
      items: [
        if (canContract && !busy)
          AnchoredMenuItem(
            id: 'contract',
            icon: open ? TI.close_rounded : TI.description_outlined,
            label: open ? 'Şartnomani yopiş' : 'Şartnoma tuziş',
          ),
        if (hasNote)
          const AnchoredMenuItem(
            id: 'note',
            icon: TI.chat_bubble_outline_rounded,
            label: 'Taklif matni',
          ),
        if (!busy)
          const AnchoredMenuItem(
            id: 'chat',
            icon: TI.send_rounded,
            label: 'Yoziş',
          ),
        const AnchoredMenuItem(
          id: 'profile',
          icon: TI.person_outline_rounded,
          label: 'Profilni köriş',
        ),
        if (canContract && !busy)
          const AnchoredMenuItem(
            id: 'reject',
            icon: TI.block_rounded,
            label: 'Rad etiş',
            danger: true,
          ),
        const AnchoredMenuItem(
          id: 'report',
          icon: TI.flag_outlined,
          label: 'Şikoyat',
          danger: true,
        ),
      ],
    );
    if (!mounted || v == null) return;
    switch (v) {
      case 'contract':
        setState(() {
          _contractFor = open ? null : x.preparer.id;
          _cAmount.text = '${x.price}';
          _cNote.clear();
          _cDeadline = o.deadline != null && o.deadline!.isAfter(DateTime.now())
              ? o.deadline
              : null;
        });
      case 'note':
        _showOfferNote(x);
      case 'chat':
        _startChat(x.preparer);
      case 'profile':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => PublicProfileScreen(userId: x.preparer.id),
          ),
        );
      case 'reject':
        _cubit.respondToOffer(x.id, accept: false);
      case 'report':
        _report(x.preparer.id);
    }
  }

  /// Taklif matni va tayyorlovçi haqida — kiçik oyna.
  void _showOfferNote(OrderOfferModel x) {
    final name = (x.preparer.name ?? '').isNotEmpty
        ? x.preparer.name!
        : (x.preparer.login ?? '—');
    showAppDialog<void>(
      context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            name,
            style: TextStyle(
              color: WebC.white,
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            "${groupDigits(x.price)} söm",
            style: TextStyle(color: WebC.zinc400, fontSize: 13),
          ),
          if ((x.message ?? '').isNotEmpty) ...[
            const SizedBox(height: kDetailGap),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.tint(0.04),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                x.message!,
                style: TextStyle(
                  color: WebC.zinc300,
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
            ),
          ],
          if ((x.preparerAbout ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              x.preparerAbout!,
              style: TextStyle(color: WebC.zinc500, fontSize: 13, height: 1.4),
            ),
          ],
          const SizedBox(height: 16),
          AppDialogButton(
            label: 'Yopiş',
            primary: false,
            onTap: () => Navigator.of(ctx).pop(),
          ),
        ],
      ),
    );
  }

  /// Tanlangan taklif ostida — şartnoma formasi (karta içida).
  Widget _contractForm(OrderOfferModel x, bool busy) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.tint(0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: WebC.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Şartnoma',
            style: TextStyle(
              color: WebC.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: kDetailGap),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _field(
                  "Summa (söm)",
                  WebInput(
                    controller: _cAmount,
                    keyboardType: TextInputType.number,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _field(
                  'Topşiriş muddati',
                  WebInput(
                    readOnly: true,
                    hint: 'Tanlang',
                    controller: TextEditingController(
                      text: _cDeadline == null
                          ? ''
                          : shortDateTime(_cDeadline!),
                    ),
                    onTap: () async {
                      final d = await pickDateTime(
                        context,
                        initial: _cDeadline,
                      );
                      if (d != null && mounted) {
                        setState(() => _cDeadline = d);
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: kDetailGap),
          _field(
            'Izoh / şartlar (ixtiyoriy)',
            WebInput(controller: _cNote, maxLines: 2, minLines: 2),
          ),
          const SizedBox(height: kDetailGap),
          ActionBtn(
            label: 'Şartnoma yuboriş',
            icon: TI.send_rounded,
            onPressed: busy
                ? null
                : () async {
                    final amount = int.tryParse(_cAmount.text.trim()) ?? 0;
                    if (amount <= 0) {
                      setState(() => _localErr = 'Summani kiriting');
                      return;
                    }
                    if (_cDeadline == null ||
                        !_cDeadline!.isAfter(DateTime.now())) {
                      setState(
                        () => _localErr =
                            'Şartnoma muddatini (sana va vaqt) tanlang',
                      );
                      return;
                    }
                    setState(() => _localErr = null);
                    final ok = await _cubit.sendContract(
                      preparerId: x.preparer.id,
                      amount: amount,
                      note: _cNote.text.trim().isEmpty
                          ? null
                          : _cNote.text.trim(),
                      deadline: _cDeadline,
                    );
                    if (ok && mounted) {
                      setState(() => _contractFor = null);
                    }
                  },
          ),
        ],
      ),
    );
  }

  Widget _reviewForm(bool busy) {
    return DetailCard(
      title: 'Tayyorlovçini baholang',
      icon: TI.star_outline_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Bahoyingiz tayyorlovçi profilida va örtaça reytingida körinadi.",
            style: TextStyle(color: WebC.zinc400, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: kDetailGap),
          Center(
            child: WebStarInput(
              value: _reviewStars,
              onChanged: (v) => setState(() => _reviewStars = v),
            ),
          ),
          const SizedBox(height: kDetailGap),
          WebInput(
            controller: _reviewComment,
            hint: 'Izoh (ixtiyoriy)',
            maxLines: 3,
            minLines: 3,
          ),
          const SizedBox(height: kDetailGap),
          ActionBtn(
            label: 'Bahoni yuboriş',
            onPressed: busy
                ? null
                : () {
                    if (_reviewStars == 0) {
                      setState(() => _localErr = 'Yulduzlar sonini tanlang');
                      return;
                    }
                    setState(() => _localErr = null);
                    _cubit.submitReview(
                      stars: _reviewStars,
                      comment: _reviewComment.text.trim().isEmpty
                          ? null
                          : _reviewComment.text.trim(),
                    );
                  },
          ),
        ],
      ),
    );
  }
}

/// Taklif holati — rangli yorliq (saytdagi OfferBadge).
class _OfferBadge extends StatelessWidget {
  const _OfferBadge({required this.status, this.compact = false});
  final String status;

  /// Ixçam qatorda — pastroq (20px).
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'ACCEPTED' => WebC.emerald,
      'REJECTED' => WebC.red,
      'PENDING' => WebC.amber,
      _ => WebC.zinc400,
    };
    return Container(
      height: compact ? 20 : 24,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        kOfferStatusLabel[status] ?? status,
        maxLines: 1,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Saytdagi ReportButton oynasi.
class _ReportForm extends StatefulWidget {
  const _ReportForm({required this.suspectId, required this.orderId});
  final String suspectId;
  final String orderId;

  @override
  State<_ReportForm> createState() => _ReportFormState();
}

class _ReportFormState extends State<_ReportForm> {
  final _body = TextEditingController();
  bool _busy = false;
  bool _done = false;
  final _errF = FlashValue<String>();
  String? get _err => _errF.value;
  set _err(String? v) => _errF.value = v;

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_body.text.trim().length < 10) {
      setState(() => _err = 'Kamida 10 ta belgi yozing');
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      await MessagesRepository().report(
        suspectId: widget.suspectId,
        orderId: widget.orderId,
        body: _body.text.trim(),
      );
      setState(() => _done = true);
    } catch (e) {
      setState(() => _err = friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return Text(
        "Şikoyatingiz yuborildi. Administrator körib çiqadi.",
        style: TextStyle(color: WebC.emerald, fontSize: 14),
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Şikoyat',
          style: TextStyle(
            color: WebC.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          "Nomaqbul xatti-harakatni batafsil yozing. Maʼlumot faqat administratorga boradi.",
          style: TextStyle(color: WebC.zinc400, fontSize: 12),
        ),
        const SizedBox(height: 12),
        WebInput(
          controller: _body,
          hint: "Nima böldi?",
          maxLines: 5,
          minLines: 5,
        ),
        FlashStatus(
          message: _err,
          trigger: _errF.seq,
          builder: (_, m) => Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(m, style: TextStyle(color: WebC.red, fontSize: 14)),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            WebButton(
              label: 'Bekor',
              variant: WebBtn.ghost,
              onPressed: _busy ? null : () => Navigator.of(context).pop(),
            ),
            const SizedBox(width: 8),
            WebButton(
              label: 'Yuboriş',
              busy: _busy,
              onPressed: _busy ? null : _submit,
            ),
          ],
        ),
      ],
    );
  }
}

/// Fayl turi (MIME) → kengaytma — ilova ichidagi ko'rsatgich mos ochishi uchun.
String _extFor(String? mime) {
  final m = (mime ?? '').toLowerCase();
  const map = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'text/plain': '.txt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
    'application/zip': '.zip',
  };
  return map[m] ?? '';
}
