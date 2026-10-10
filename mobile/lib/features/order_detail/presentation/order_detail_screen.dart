import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/app_header_sliver.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../auth/data/user_model.dart';
import '../../dashboard/data/order_model.dart';
import '../../home/section_cubit.dart';
import '../../messages/data/message_model.dart';
import '../../messages/data/messages_repository.dart';
import '../../messages/presentation/chat_screen.dart';
import '../../public_profile/presentation/public_profile_screen.dart';
import '../cubit/order_detail_cubit.dart';
import '../data/order_detail_model.dart';
import '../data/order_detail_repository.dart';

const _minOfferStars = 2;

/// Saytdagi /orders/[id] sahifasi bilan bir xil.
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
          return WebPage(
            children: [
              const WebBackLink(),
              const SizedBox(height: 24),
              if (state.status == OrderDetailStatus.failure)
                WebCard(child: Text(state.error ?? 'Topilmadi', style: TextStyle(color: WebC.zinc500, fontSize: 14)))
              else ...[
                const SBlock(height: 70),
                const SizedBox(height: 24),
                const SBar(width: 120, height: 12),
                const SizedBox(height: 10),
                const SBar(width: 240, height: 24),
                const SizedBox(height: 24),
                const SBlock(height: 90),
              ],
            ],
          );
        }
        return WebPage(
          onRefresh: () => context.read<OrderDetailCubit>().load(),
          gap: 24,
          children: _sections(context, state, order, me),
        );
      },
    );
  }

  List<Widget> _sections(BuildContext context, OrderDetailState state, OrderDetailModel o, UserModel? me) {
    final meId = me?.id ?? '';
    final isOrderer = o.orderer.id == meId;
    final isPreparer = me?.isPreparer ?? false;
    final isAssigned = o.preparer?.id == meId;

    final meta = <String>[
      if (o.deadline != null) 'Muddat: ${shortDate(o.deadline!)}',
      if ((o.budget ?? 0) > 0) "Byudjet: ${groupDigits(o.budget!)} so'm",
    ];

    return [
      const WebBackLink(),
      if (o.deleted) _DeletedNotice(order: o),
      if (!isOrderer) _PersonCard(person: o.orderer, role: 'Buyurtmachi'),
      if (o.preparer != null && !isAssigned) _PersonCard(person: o.preparer!, role: 'Tayyorlovchi'),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${kOrderTypeLabel[o.type] ?? o.type} · ${kOrderStatusLabel[o.status] ?? o.status}'.toUpperCase(),
            style: TextStyle(color: WebC.indigo, fontSize: 12, letterSpacing: 0.6),
          ),
          const SizedBox(height: 8),
          Text(o.title,
              style: TextStyle(color: WebC.white, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: -0.4, height: 1.25)),
        ],
      ),
      WebCard(child: Text(o.description, style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45))),
      if (meta.isNotEmpty)
        Wrap(
          spacing: 16,
          runSpacing: 6,
          children: [for (final m in meta) Text(m, style: TextStyle(color: WebC.zinc400, fontSize: 14))],
        ),
      if (o.files.isNotEmpty) _Files(files: o.files),
      if (!o.deleted)
        _OrderActions(order: o, state: state, meId: meId, isOrderer: isOrderer, isPreparer: isPreparer, isAssigned: isAssigned),
      if (isOrderer && !o.deleted)
        Container(
          padding: const EdgeInsets.only(top: 16),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: WebC.border))),
          alignment: Alignment.centerLeft,
          child: _DeleteButton(),
        ),
    ];
  }
}

class _DeletedNotice extends StatelessWidget {
  const _DeletedNotice({required this.order});
  final OrderDetailModel order;

  @override
  Widget build(BuildContext context) {
    final by = order.deletedByRole == 'ADMIN' ? 'Administrator tomonidan' : 'Buyurtmachi tomonidan';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEF4444).withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF87171).withValues(alpha: 0.30)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("🗑 Bu buyurtma o'chirilgan",
              style: TextStyle(color: WebC.redSoft, fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('$by${order.deletedAt != null ? ' · ${shortDateTime(order.deletedAt!)}' : ''}',
              style: TextStyle(color: WebC.zinc400, fontSize: 14)),
          if ((order.deleteReason ?? '').isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Sabab: ${order.deleteReason}', style: TextStyle(color: WebC.zinc300, fontSize: 14)),
          ],
          const SizedBox(height: 4),
          Text("U faqat sizga ko'rinadi, boshqalarga emas.", style: TextStyle(color: WebC.zinc500, fontSize: 12)),
        ],
      ),
    );
  }
}

/// Saytdagi PersonCard: avatar, ism, onlayn holat, "Buyurtmachi · profilga ›".
class _PersonCard extends StatelessWidget {
  const _PersonCard({required this.person, required this.role});
  final OrderPartyModel person;
  final String role;

  @override
  Widget build(BuildContext context) {
    final img = person.image ?? '';
    final name = (person.name ?? '').isNotEmpty ? person.name! : (person.login != null ? '@${person.login}' : role);
    return WebCard(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PublicProfileScreen(userId: person.id)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(shape: BoxShape.circle, color: WebC.fill5, border: Border.all(color: WebC.border)),
            child: img.isEmpty ? null : Image.network(img, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: person.online ? const Color(0xFF34D399) : const Color(0xFF52525B),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(person.presence ?? 'oflayn',
                        style: TextStyle(color: person.online ? WebC.emerald : WebC.zinc500, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text('$role · profilga ›', style: TextStyle(color: WebC.zinc600, fontSize: 12)),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Fayllar', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        for (final f in files)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: f.url != null
                ? GestureDetector(
                    onTap: () => launchUrl(Uri.parse(f.url!), mode: LaunchMode.externalApplication),
                    child: Text('${f.kind} · ${(f.size / 1024).toStringAsFixed(0)} KB',
                        style: TextStyle(color: WebC.indigo, fontSize: 14)),
                  )
                : Text("${f.kind} (kirish uchun ruxsat yo'q)", style: TextStyle(color: WebC.zinc500, fontSize: 14)),
          ),
      ],
    );
  }
}

class _DeleteButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final busy = context.select<OrderDetailCubit, bool>((c) => c.state.busy);
    return GestureDetector(
      onTap: busy
          ? null
          : () async {
              final ok = await confirmDialog(
                context,
                title: "Buyurtma o'chirilsinmi?",
                message:
                    "Boshqalarga ko'rinmaydi, lekin sizda «o'chirilgan» holatida qoladi. Faol shartnomadagi mablag' qaytariladi.",
                confirmLabel: "O'chirish",
                cancelLabel: 'Bekor',
              );
              if (ok == true && context.mounted) context.read<OrderDetailCubit>().deleteOrder();
            },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(busy ? '...' : "🗑 Buyurtmani o'chirish", style: TextStyle(color: WebC.redSoft, fontSize: 14)),
      ),
    );
  }
}

/// Saytdagi OrderActions: rol va holatga qarab tugmalar/formalar.
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
  late final _price = TextEditingController(text: _myOffer?.price.toString() ?? '');
  late final _message = TextEditingController(text: _myOffer?.message ?? '');
  final _offerStars = TextEditingController(text: '$_minOfferStars');
  final _boost = TextEditingController();
  final _cAmount = TextEditingController();
  final _cNote = TextEditingController();
  final _reviewComment = TextEditingController();
  int _reviewStars = 0;
  String? _contractFor;
  String? _localErr;
  bool _chatBusy = false;

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
    for (final c in [_price, _message, _offerStars, _boost, _cAmount, _cNote, _reviewComment]) {
      c.dispose();
    }
    super.dispose();
  }

  OrderDetailCubit get _cubit => context.read<OrderDetailCubit>();

  Future<void> _startChat(OrderPartyModel user) async {
    setState(() {
      _chatBusy = true;
      _localErr = null;
    });
    try {
      final id = await MessagesRepository().startConversation(user.id, orderId: o.id);
      if (!mounted) return;
      await Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ChatScreen(
          conversationId: id,
          other: ChatOtherUser(
            id: user.id,
            name: (user.name ?? '').isNotEmpty ? user.name! : (user.login ?? 'Foydalanuvchi'),
            login: user.login,
            image: user.image,
            isSupport: false,
          ),
        ),
      ));
    } on ApiException catch (e) {
      setState(() => _localErr = e.message);
    } finally {
      if (mounted) setState(() => _chatBusy = false);
    }
  }

  void _report(String suspectId) {
    showWebDialog(context, builder: (_) => _ReportForm(suspectId: suspectId, orderId: o.id));
  }

  @override
  Widget build(BuildContext context) {
    final busy = widget.state.busy || _chatBusy;
    final status = o.status;
    final sent = _contract('SENT');
    final accepted = _contract('ACCEPTED');
    final incoming = widget.isPreparer && sent?.preparerId == widget.meId ? sent : null;
    final err = _localErr ?? widget.state.error;
    final myOffer = _myOffer;

    final children = <Widget>[
      if (err != null) Text(err, style: TextStyle(color: WebC.red, fontSize: 14)),

      if (widget.isAssigned)
        Align(
          alignment: Alignment.centerLeft,
          child: WebButton(
            label: '💬 Buyurtmachi bilan yozishish',
            variant: WebBtn.ghost,
            onPressed: busy ? null : () => _startChat(o.orderer),
          ),
        ),

      // Tayyorlovchiga kelgan shartnoma
      if (incoming != null)
        _TintCard(
          color: const Color(0xFF6366F1),
          border: const Color(0xFF818CF8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('📄 Sizga shartnoma yuborildi',
                  style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              _rich('Kelishilgan summa: ', "${groupDigits(incoming.amount)} so'm"),
              if ((incoming.note ?? '').isNotEmpty) ...[
                const SizedBox(height: 4),
                Text('Izoh: ${incoming.note}', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
              ],
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, children: [
                WebButton(
                  label: 'Qabul qilish va boshlash',
                  onPressed: busy ? null : () => _cubit.respondToContract(incoming.id, action: 'ACCEPT'),
                ),
                WebButton(
                  label: 'Rad etish',
                  variant: WebBtn.ghost,
                  onPressed: busy ? null : () => _cubit.respondToContract(incoming.id, action: 'DECLINE'),
                ),
              ]),
            ],
          ),
        ),

      // Buyurtmachi: yuborilgan shartnoma holati
      if (widget.isOrderer && sent != null)
        _TintCard(
          color: const Color(0xFF6366F1),
          border: const Color(0xFF818CF8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45),
                  children: [
                    const TextSpan(text: '📄 '),
                    TextSpan(text: sent.preparerName, style: const TextStyle(fontWeight: FontWeight.w700)),
                    TextSpan(text: " ga shartnoma yuborildi — ${groupDigits(sent.amount)} so'm. Javob kutilmoqda."),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              WebButton(
                label: 'Bekor qilish',
                variant: WebBtn.ghost,
                onPressed: busy ? null : () => _cubit.respondToContract(sent.id, action: 'CANCEL'),
              ),
            ],
          ),
        ),

      // Tayyorlovchi: taklif yuborish / yangilash
      if (widget.isPreparer && !widget.isAssigned && status == 'OPEN') _offerForm(myOffer, busy),

      // Navbat
      if (widget.isPreparer && !widget.isOrderer && status == 'OPEN' && o.queue.isNotEmpty) _queue(),

      // Buyurtmachi: takliflar
      if (widget.isOrderer) _offers(busy, status, sent),

      // Baholash (buyurtmachi)
      if (widget.isOrderer && status == 'DONE')
        o.review != null
            ? WebCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Sizning bahoyingiz', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    WebStars(value: o.review!.stars.toDouble(), size: 16),
                    if ((o.review!.comment ?? '').isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('«${o.review!.comment}»', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
                    ],
                  ],
                ),
              )
            : _reviewForm(busy),

      // Tayyorlovchiga qo'yilgan baho
      if (widget.isAssigned && status == 'DONE')
        WebCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Sizga qo'yilgan baho", style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              if (o.review != null) ...[
                WebStars(value: o.review!.stars.toDouble(), size: 16),
                const SizedBox(height: 8),
                Text(
                  (o.review!.comment ?? '').isNotEmpty ? '«${o.review!.comment}»' : 'Sharh qoldirilmagan.',
                  style: TextStyle(color: (o.review!.comment ?? '').isNotEmpty ? WebC.zinc400 : WebC.zinc500, fontSize: 14),
                ),
              ] else
                Text("Buyurtmachi hali baho qo'ymagan.", style: TextStyle(color: WebC.zinc500, fontSize: 14)),
            ],
          ),
        ),

      // Yakunlash (faqat buyurtmachi)
      if (widget.isOrderer && accepted != null && (status == 'IN_PROGRESS' || status == 'DELIVERED'))
        _TintCard(
          color: const Color(0xFF10B981),
          border: const Color(0xFF34D399),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45),
                  children: [
                    const TextSpan(text: 'Ish tayyor bo\'lsa yakunlang — '),
                    TextSpan(text: "${groupDigits(accepted.amount)} so'm", style: const TextStyle(fontWeight: FontWeight.w700)),
                    const TextSpan(text: ' to\'liq (komissiyasiz) tayyorlovchi hisobiga o\'tadi.'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, children: [
                WebButton(label: '✅ Buyurtmani yakunlash', onPressed: busy ? null : () => _cubit.finalizeOrder()),
                WebButton(
                  label: '✖ Shartnomani bekor qilish',
                  variant: WebBtn.ghost,
                  onPressed: busy
                      ? null
                      : () async {
                          final ok = await confirmDialog(
                            context,
                            title: 'Shartnoma bekor qilinsinmi?',
                            message: "Shartnoma bekor qilinadi. Mablag' to'liq (komissiyasiz) sizga qaytadi. Davom etilsinmi?",
                            confirmLabel: 'Ha',
                            cancelLabel: "Yo'q",
                          );
                          if (ok == true) _cubit.respondToContract(accepted.id, action: 'CANCEL');
                        },
                ),
              ]),
            ],
          ),
        ),

      // Holatni o'zgartirish
      if ((widget.isAssigned && status == 'IN_PROGRESS') || (widget.isOrderer && status == 'OPEN'))
        Wrap(spacing: 8, runSpacing: 8, children: [
          if (widget.isAssigned && status == 'IN_PROGRESS')
            WebButton(
              label: 'Ishni topshirdim (buyurtmachi yakunlaydi)',
              onPressed: busy ? null : () => _cubit.setStatus('DELIVERED'),
            ),
          if (widget.isOrderer && status == 'OPEN')
            WebButton(
              label: 'Buyurtmani bekor qilish',
              variant: WebBtn.ghost,
              onPressed: busy ? null : () => _cubit.setStatus('CANCELLED'),
            ),
        ]),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const SizedBox(height: 16),
          children[i],
        ],
      ],
    );
  }

  Widget _rich(String a, String b) => Text.rich(TextSpan(
        style: TextStyle(color: WebC.zinc300, fontSize: 14),
        children: [TextSpan(text: a), TextSpan(text: b, style: const TextStyle(fontWeight: FontWeight.w700))],
      ));

  Widget _link(String text, Color color) => GestureDetector(
        onTap: () => goToSection(context, AppSection.wallet),
        child: Text(text,
            style: TextStyle(color: color, fontSize: 12, decoration: TextDecoration.underline, decorationColor: color)),
      );

  Widget _offerForm(OrderOfferModel? myOffer, bool busy) {
    final stars = int.tryParse(_offerStars.text) ?? _minOfferStars;
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(myOffer != null ? 'Taklifni yangilash' : 'Taklif yuborish',
              style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          const WebLabel("Narx (so'm)"),
          WebInput(controller: _price, keyboardType: TextInputType.number),
          const SizedBox(height: 12),
          const WebLabel('Xabar'),
          WebInput(controller: _message, maxLines: 3, minLines: 3),
          if (myOffer == null) ...[
            const SizedBox(height: 12),
            const WebLabel("Star (navbatdagi boshlang'ich o'rningiz — kamida $_minOfferStars)"),
            WebInput(controller: _offerStars, keyboardType: TextInputType.number, onChanged: (_) => setState(() {})),
            const SizedBox(height: 4),
            Text(
              '⭐ Kamida $_minOfferStars star talab qiladi — navbatda yuqoriroqda turish uchun boshidanoq ko\'proq '
              'yuborishingiz mumkin. Star balansingizdan sarflanadi.',
              style: TextStyle(color: WebC.amber, fontSize: 12, height: 1.4),
            ),
            _link('Star yetarli emasmi? Hamyondan sotib oling →', WebC.amber),
          ],
          const SizedBox(height: 12),
          WebButton(
            label: myOffer != null ? 'Yangilash' : 'Yuborish (${stars > 0 ? stars : _minOfferStars} ⭐)',
            expand: true,
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
                      message: _message.text.trim().isEmpty ? null : _message.text.trim(),
                      stars: myOffer == null ? (stars > 0 ? stars : _minOfferStars) : null,
                    );
                  },
          ),
          if (myOffer != null) ...[
            const SizedBox(height: 12),
            Container(height: 1, color: WebC.border),
            const SizedBox(height: 12),
            Text.rich(TextSpan(
              style: TextStyle(color: WebC.zinc500, fontSize: 12),
              children: [
                TextSpan(text: 'Holat: ${myOffer.status} · Jami sarflangan: '),
                TextSpan(text: '${myOffer.starsSpent} ⭐', style: TextStyle(color: WebC.amber, fontWeight: FontWeight.w700)),
              ],
            )),
            const SizedBox(height: 8),
            Row(
              children: [
                SizedBox(width: 112, child: WebInput(controller: _boost, hint: 'star', keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Flexible(
                  child: WebButton(
                    label: '🚀 Navbatda yuqoriga chiqish',
                    variant: WebBtn.ghost,
                    onPressed: busy
                        ? null
                        : () {
                            final n = int.tryParse(_boost.text.trim()) ?? 0;
                            if (n <= 0) {
                              setState(() => _localErr = 'Star sonini kiriting');
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
            const SizedBox(height: 8),
            Wrap(children: [
              Text("Navbatda ko'proq star sarflaganlar yuqorida turadi. ", style: TextStyle(color: WebC.zinc600, fontSize: 12)),
              _link('Star sotib olish →', WebC.zinc600),
            ]),
          ],
        ],
      ),
    );
  }

  Widget _queue() {
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Navbat (${o.queue.length})', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text("Ko'proq star sarflagan yuqorida turadi. Boshqa ishtirokchilarning ismi qisman yashiringan.",
              style: TextStyle(color: WebC.zinc500, fontSize: 12, height: 1.4)),
          const SizedBox(height: 8),
          for (final q in o.queue)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: q.mine
                    ? const Color(0xFF6366F1).withValues(alpha: 0.10)
                    : (AppColors.isLight ? Colors.black.withValues(alpha: 0.03) : Colors.white.withValues(alpha: 0.03)),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: q.mine ? const Color(0xFF818CF8).withValues(alpha: 0.30) : Colors.transparent),
              ),
              child: Row(
                children: [
                  Text('#${q.position}', style: TextStyle(color: WebC.zinc500, fontSize: 14)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Row(
                      children: [
                        Flexible(
                          child: Text(q.visible,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w500)),
                        ),
                        if (q.hiddenLen > 0)
                          ImageFiltered(
                            imageFilter: ImageFilter.blur(sigmaX: 3, sigmaY: 3),
                            child: Text('•' * q.hiddenLen.clamp(0, 10),
                                style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w500)),
                          ),
                        if (q.mine) ...[
                          const SizedBox(width: 8),
                          Text('(siz)', style: TextStyle(color: WebC.indigoSoft, fontSize: 12)),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text('${q.starsSpent} ⭐', style: TextStyle(color: WebC.amber, fontSize: 12)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _offers(bool busy, String status, ContractModel? sent) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Takliflar (${o.offers.length})', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        if (o.offers.isEmpty) Text("Hozircha taklif yo'q.", style: TextStyle(color: WebC.zinc500, fontSize: 14)),
        for (final x in o.offers) ...[
          _offerCard(x, busy, status, sent),
          const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _offerCard(OrderOfferModel x, bool busy, String status, ContractModel? sent) {
    void profile() => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => PublicProfileScreen(userId: x.preparer.id)),
        );
    final name = (x.preparer.name ?? '').isNotEmpty ? x.preparer.name! : (x.preparer.login ?? '—');
    final open = _contractFor == x.preparer.id;
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: profile,
                  child: Text.rich(TextSpan(
                    style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w500),
                    children: [
                      TextSpan(text: name),
                      if (x.preparer.login != null)
                        TextSpan(text: ' @${x.preparer.login}', style: TextStyle(color: WebC.zinc400, fontWeight: FontWeight.w400)),
                    ],
                  )),
                ),
              ),
              const SizedBox(width: 12),
              Text('${x.starsSpent} ⭐', style: TextStyle(color: WebC.amber, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: profile,
            child: Row(
              children: [
                WebStars(value: x.preparerRating ?? 0),
                const SizedBox(width: 8),
                Text(x.preparerRating != null ? x.preparerRating!.toStringAsFixed(1) : 'yangi',
                    style: TextStyle(color: WebC.zinc300, fontSize: 14)),
                const SizedBox(width: 8),
                Text('(${x.preparerRatingCount} baho)', style: TextStyle(color: WebC.zinc500, fontSize: 12)),
              ],
            ),
          ),
          if ((x.preparerAbout ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(x.preparerAbout!, style: TextStyle(color: WebC.zinc500, fontSize: 12, height: 1.4)),
          ],
          const SizedBox(height: 8),
          _rich('Narx: ', "${groupDigits(x.price)} so'm"),
          if ((x.message ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(x.message!, style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45)),
          ],
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              WebButton(label: '💬 Chat', variant: WebBtn.ghost, onPressed: busy ? null : () => _startChat(x.preparer)),
              WebButton(label: '⚠︎ Shikoyat', variant: WebBtn.ghost, onPressed: () => _report(x.preparer.id)),
              if (status == 'OPEN' && x.status == 'PENDING' && sent == null) ...[
                WebButton(
                  label: '📄 Shartnoma tuzish',
                  onPressed: busy
                      ? null
                      : () => setState(() {
                            _contractFor = open ? null : x.preparer.id;
                            _cAmount.text = '${x.price}';
                            _cNote.clear();
                          }),
                ),
                WebButton(
                  label: 'Rad etish',
                  variant: WebBtn.ghost,
                  onPressed: busy ? null : () => _cubit.respondToOffer(x.id, accept: false),
                ),
              ],
              if (x.status != 'PENDING') Text(x.status, style: TextStyle(color: WebC.zinc400, fontSize: 12)),
            ],
          ),
          if (open) ...[
            const SizedBox(height: 4),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.isLight ? Colors.black.withValues(alpha: 0.03) : Colors.white.withValues(alpha: 0.03),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: WebC.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Kelishilgan shartnoma', style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  const WebLabel("Kelishilgan summa (so'm)"),
                  WebInput(controller: _cAmount, keyboardType: TextInputType.number),
                  const SizedBox(height: 8),
                  const WebLabel('Izoh / shartlar (ixtiyoriy)'),
                  WebInput(controller: _cNote, maxLines: 2, minLines: 2),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: WebButton(
                      label: 'Shartnoma yuborish',
                      onPressed: busy
                          ? null
                          : () async {
                              final amount = int.tryParse(_cAmount.text.trim()) ?? 0;
                              if (amount <= 0) {
                                setState(() => _localErr = 'Summani kiriting');
                                return;
                              }
                              setState(() => _localErr = null);
                              final ok = await _cubit.sendContract(
                                preparerId: x.preparer.id,
                                amount: amount,
                                note: _cNote.text.trim().isEmpty ? null : _cNote.text.trim(),
                              );
                              if (ok && mounted) setState(() => _contractFor = null);
                            },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _reviewForm(bool busy) {
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tayyorlovchini baholang', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text("Bahoyingiz tayyorlovchi profilida va o'rtacha reytingida ko'rinadi.",
              style: TextStyle(color: WebC.zinc400, fontSize: 14)),
          const SizedBox(height: 12),
          WebStarInput(value: _reviewStars, onChanged: (v) => setState(() => _reviewStars = v)),
          const SizedBox(height: 12),
          WebInput(controller: _reviewComment, hint: 'Izoh (ixtiyoriy)', maxLines: 3, minLines: 3),
          const SizedBox(height: 12),
          WebButton(
            label: busy ? '...' : 'Bahoni yuborish',
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
                      comment: _reviewComment.text.trim().isEmpty ? null : _reviewComment.text.trim(),
                    );
                  },
          ),
        ],
      ),
    );
  }
}

/// Rangli ramkali karta (`card border-indigo-400/30 bg-indigo-500/5` kabi).
class _TintCard extends StatelessWidget {
  const _TintCard({required this.child, required this.color, required this.border});
  final Widget child;
  final Color color;
  final Color border;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: AppColors.isLight ? 0.08 : 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border.withValues(alpha: 0.28)),
      ),
      child: child,
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
  String? _err;

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
      await MessagesRepository().report(suspectId: widget.suspectId, orderId: widget.orderId, body: _body.text.trim());
      setState(() => _done = true);
    } on ApiException catch (e) {
      setState(() => _err = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return Text("Shikoyatingiz yuborildi. Administrator ko'rib chiqadi.", style: TextStyle(color: WebC.emerald, fontSize: 14));
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Shikoyat', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        Text("Nomaqbul xatti-harakatni batafsil yozing. Ma'lumot faqat administratorga boradi.",
            style: TextStyle(color: WebC.zinc400, fontSize: 12)),
        const SizedBox(height: 12),
        WebInput(controller: _body, hint: "Nima bo'ldi?", maxLines: 5, minLines: 5),
        if (_err != null) ...[
          const SizedBox(height: 12),
          Text(_err!, style: TextStyle(color: WebC.red, fontSize: 14)),
        ],
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            WebButton(label: 'Bekor', variant: WebBtn.ghost, onPressed: _busy ? null : () => Navigator.of(context).pop()),
            const SizedBox(width: 8),
            WebButton(label: _busy ? '...' : 'Yuborish', onPressed: _busy ? null : _submit),
          ],
        ),
      ],
    );
  }
}
