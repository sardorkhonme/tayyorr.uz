import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/format.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/date_time_picker.dart';
import '../../../widgets/web_ui.dart';
import '../cubit/order_detail_cubit.dart';
import '../data/order_detail_model.dart';
import 'detail_ui.dart';
import '../../../widgets/flash_status.dart';

/// Saytdagi ContractPanel: imzolangan shartnoma — muddat, topshirish,
/// yakunlash / qayta ishlash va ikki tomonlama bekor qilish so'rovi.
class ContractPanel extends StatelessWidget {
  const ContractPanel({
    super.key,
    required this.order,
    required this.contract,
    required this.meId,
    required this.isOrderer,
    required this.busy,
  });

  final OrderDetailModel order;
  final ContractModel contract;
  final String meId;
  final bool isOrderer;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final c = contract;
    final cubit = context.read<OrderDetailCubit>();
    final delivered = order.status == 'DELIVERED';
    // rad etilgan so'rov: holat hali PENDING, lekin rad etish sababi bor — endi so'ragan tomon tanlaydi
    final rejected =
        c.cancelState == 'PENDING' && (c.cancelRejectReason ?? '').isNotEmpty;
    final pending = c.cancelState == 'PENDING' && !rejected;
    final disputed = c.cancelState == 'DISPUTED';
    final iRequested = (pending || rejected) && c.cancelRequestedById == meId;
    final otherRequested = pending && !iRequested;
    final requester = c.cancelRequestedById == null
        ? ''
        : c.cancelRequestedById == meId
        ? 'Siz'
        : (isOrderer ? 'Tayyorlovçi' : 'Buyurtmaçi');
    final som = "${groupDigits(c.amount)} söm";

    Future<void> askReason(String action, String title, String help) async {
      final reason = await showWebDialog<String>(
        context,
        builder: (_) => _ReasonDialog(title: title, help: help),
      );
      if (reason != null) {
        await cubit.respondToContract(c.id, action: action, reason: reason);
      }
    }

    Future<void> askRevision() async {
      final res = await showWebDialog<(String, DateTime)>(
        context,
        builder: (_) => _ReasonDialog(
          title: 'Nimani qayta işlaş kerak?',
          help:
              "Iş tayyorlovçiga qaytadi. Yangi muddatgaça qayta topşirilmasa — şartnoma bekor bölib pul sizga qaytadi.",
          withDeadline: true,
          initialDeadline: c.deadline,
        ),
      );
      if (res != null) {
        await cubit.requestRevision(reason: res.$1, deadline: res.$2);
      }
    }

    final dueText = c.cancelDueAt != null
        ? shortDateTime(c.cancelDueAt!)
        : null;

    // asosiy amallar — rolga qarab
    final mainActions = <Widget>[
      if (isOrderer && delivered && c.cancelState == null)
        ActionBtn(
          label: 'Qayta işlaş',
          icon: TI.refresh_rounded,
          kind: ActionKind.ghost,
          onPressed: busy ? null : askRevision,
        ),
      if (isOrderer)
        ActionBtn(
          label: 'Yakunlaş',
          icon: TI.check_circle_outline_rounded,
          onPressed: busy
              ? null
              : () async {
                  final ok = await confirmDialog(
                    context,
                    title: 'Iş yakunlansinmi?',
                    message:
                        "Iş yakunlanadi va $som töliq tayyorlovçiga ötadi.",
                    confirmLabel: 'Yakunlaş',
                    cancelLabel: 'Bekor',
                  );
                  if (ok == true) cubit.finalizeOrder();
                },
        ),
      if (!isOrderer && order.status == 'IN_PROGRESS')
        ActionBtn(
          label: 'Işni topşirdim',
          icon: TI.inventory_2_outlined,
          onPressed: busy ? null : () => cubit.setStatus('DELIVERED'),
        ),
    ];

    return DetailCard(
      title: 'Şartnoma imzolangan',
      icon: TI.description_outlined,
      tint: const Color(0xFF10B981),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          KeyValueRow(label: 'Summa', value: som),
          if (isOrderer)
            KeyValueRow(label: 'Tayyorlovçi', value: c.preparerName),
          if (c.deadline != null)
            KeyValueRow(
              label: 'Topşiriş muddati',
              value: shortDateTime(c.deadline!),
            ),
          if (c.revisionCount > 0)
            KeyValueRow(
              label: 'Qayta işlaş',
              value: '${c.revisionCount} marta',
            ),
          const SizedBox(height: 8),
          if (delivered && c.reviewDueAt != null)
            InfoNote(
              icon: TI.inventory_2_outlined,
              title:
                  "Iş topşirilgan${c.deliveredAt != null ? ' · ${shortDateTime(c.deliveredAt!)}' : ''}",
              text:
                  "${isOrderer ? 'Tekşirib javob bering' : 'Buyurtmaçi tekşirmoqda'} — ${shortDateTime(c.reviewDueAt!)} "
                  "gaça javob bölmasa, iş muvaffaqiyatli deb topiladi va pul tayyorlovçiga ötadi.",
            )
          else if (!delivered && c.cancelState == null)
            const InfoNote(
              icon: TI.schedule_rounded,
              text:
                  "Muddat tugagunça iş topşirilmasa, şartnoma bekor böladi va pul buyurtmaçiga qaytadi.",
            ),

          // bekor qilish so'rovi
          if (pending) ...[
            const SizedBox(height: kDetailGap),
            InfoNote(
              icon: TI.warning_amber_rounded,
              color: const Color(0xFFF59E0B),
              title:
                  "$requester bekor qilişni söra${requester == 'Siz' ? 'dingiz' : 'di'}",
              text: [
                'Sabab: ${c.cancelReason ?? ''}',
                if (dueText != null)
                  "${iRequested ? 'Ikkinçi tomon' : 'Siz'} $dueText gaça javob "
                      "${iRequested ? 'beradi' : 'bering'}. Javob bölmasa — rozi deb hisoblanadi va pul buyurtmaçiga qaytariladi.",
              ].join('\n'),
            ),
            const SizedBox(height: kDetailGap),
            if (otherRequested)
              ActionGroup(
                children: [
                  ActionBtn(
                    label: 'Rozi emasman',
                    kind: ActionKind.ghost,
                    onPressed: busy
                        ? null
                        : () => askReason(
                            'REJECT_CANCEL',
                            'Nega rozi emassiz?',
                            "Sababingiz söragan tomonga yuboriladi. U şartnomani davom ettirişi yoki masalani administratorga yuborişi mumkin.",
                          ),
                  ),
                  ActionBtn(
                    label: 'Roziman',
                    icon: TI.check_rounded,
                    onPressed: busy
                        ? null
                        : () async {
                            final ok = await confirmDialog(
                              context,
                              title: 'Bekor qilinsinmi?',
                              message:
                                  "Şartnoma bekor qilinadi va $som buyurtmaçiga qaytariladi. Rozimisiz?",
                              confirmLabel: 'Roziman',
                              cancelLabel: "Yöq",
                            );
                            if (ok == true) {
                              cubit.respondToContract(
                                c.id,
                                action: 'APPROVE_CANCEL',
                              );
                            }
                          },
                  ),
                ],
              ),
            if (iRequested)
              ActionBtn(
                label: "Sörovni qaytarib oliş",
                icon: TI.reply_rounded,
                kind: ActionKind.ghost,
                onPressed: busy
                    ? null
                    : () => cubit.respondToContract(
                        c.id,
                        action: 'WITHDRAW_CANCEL',
                      ),
              ),
          ],

          // rozi bo'linmadi — so'ragan tomon: davom ettiradi yoki adminga yuboradi
          if (rejected) ...[
            const SizedBox(height: kDetailGap),
            InfoNote(
              icon: TI.highlight_off_rounded,
              color: const Color(0xFFF97316),
              title: iRequested
                  ? "${isOrderer ? 'Tayyorlovçi' : 'Buyurtmaçi'} bekor qilişga rozi bölmadi"
                  : "Siz bekor qilişga rozi bölmadingiz",
              text: [
                'Bekor qiliş sababi: ${c.cancelReason ?? ''}',
                'Rad etiş sababi: ${c.cancelRejectReason ?? ''}',
                iRequested
                    ? "Endi siz tanlang${dueText != null ? ' ($dueText gaça)' : ''}: şartnomani davom ettiriş yoki masalani administratorga yuboriş. Tanlamasangiz — şartnoma davom etadi."
                    : "Endi ${requester.toLowerCase()} qaror qiladi: şartnomani davom ettiradi yoki masalani administratorga yuboradi${dueText != null ? ' ($dueText gaça)' : ''}.",
              ].join('\n'),
            ),
            if (iRequested) ...[
              const SizedBox(height: kDetailGap),
              ActionGroup(
                children: [
                  ActionBtn(
                    label: 'Adminga yuboriş',
                    icon: TI.balance_rounded,
                    kind: ActionKind.ghost,
                    onPressed: busy
                        ? null
                        : () async {
                            final ok = await confirmDialog(
                              context,
                              title: "Qaroringiz özgarmaydimi?",
                              message:
                                  'Masala administratorga yuboriladi va u yakuniy qaror qabul qiladi.',
                              confirmLabel: 'Ha, yuborilsin',
                              cancelLabel: 'Bekor',
                            );
                            if (ok == true) {
                              cubit.respondToContract(
                                c.id,
                                action: 'INSIST_CANCEL',
                              );
                            }
                          },
                  ),
                  ActionBtn(
                    label: 'Davom ettiraman',
                    icon: TI.check_circle_outline_rounded,
                    onPressed: busy
                        ? null
                        : () => cubit.respondToContract(
                            c.id,
                            action: 'WITHDRAW_CANCEL',
                          ),
                  ),
                ],
              ),
            ],
          ],

          if (disputed) ...[
            const SizedBox(height: kDetailGap),
            InfoNote(
              icon: TI.balance_rounded,
              color: const Color(0xFFEF4444),
              title: "Masala administrator körib çiqmoqda",
              text: [
                'Bekor qiliş sababi: ${c.cancelReason ?? ''}',
                'Rad etiş sababi: ${c.cancelRejectReason ?? ''}',
                "Admin bekor qiliş, davom ettiriş yoki yakunlaş böyiça qaror qabul qiladi. Qaror çatga yoziladi.",
              ].join('\n'),
            ),
          ],

          // asosiy amallar
          if (!disputed && mainActions.isNotEmpty) ...[
            const SizedBox(height: kDetailGap),
            ActionGroup(children: mainActions),
          ],
          if (!disputed && c.cancelState == null) ...[
            const SizedBox(height: 8),
            ActionBtn(
              label: "Bekor qilişni söraş",
              icon: TI.highlight_off_rounded,
              kind: ActionKind.ghost,
              onPressed: busy
                  ? null
                  : () => askReason(
                      'REQUEST_CANCEL',
                      'Bekor qiliş sababi',
                      "Ikkinçi tomonga yuboriladi. U 3 iş kuni içida rozi bölsa (yoki javob bermasa) — pul buyurtmaçiga qaytadi. Rozi bölmasa — siz davom ettiriş yoki masalani administratorga yuborişni tanlaysiz.",
                    ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Sabab (va qayta ishlashda — yangi muddat) so'raydigan oyna.
/// Natija: String (sabab) yoki (String, DateTime) — withDeadline bo'lsa.
class _ReasonDialog extends StatefulWidget {
  const _ReasonDialog({
    required this.title,
    required this.help,
    this.withDeadline = false,
    this.initialDeadline,
  });
  final String title;
  final String help;
  final bool withDeadline;
  final DateTime? initialDeadline;

  @override
  State<_ReasonDialog> createState() => _ReasonDialogState();
}

class _ReasonDialogState extends State<_ReasonDialog> {
  final _reason = TextEditingController();
  DateTime? _deadline;
  final _errF = FlashValue<String>();
  String? get _err => _errF.value;
  set _err(String? v) => _errF.value = v;

  @override
  void initState() {
    super.initState();
    final d = widget.initialDeadline;
    if (widget.withDeadline &&
        d != null &&
        d.isAfter(DateTime.now().add(const Duration(hours: 1)))) {
      _deadline = d;
    }
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  void _submit() {
    final r = _reason.text.trim();
    if (r.length < 5) {
      setState(() => _err = 'Sababni yozing (kamida 5 belgi)');
      return;
    }
    if (widget.withDeadline) {
      if (_deadline == null ||
          !_deadline!.isAfter(
            DateTime.now().add(const Duration(minutes: 30)),
          )) {
        setState(
          () => _err =
              'Yangi muddatni (sana va vaqt) tanlang — kamida 30 daqiqadan keyin',
        );
        return;
      }
      Navigator.of(context).pop((r, _deadline!));
    } else {
      Navigator.of(context).pop(r);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          widget.title,
          style: TextStyle(
            color: WebC.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          widget.help,
          style: TextStyle(color: WebC.zinc400, fontSize: 12, height: 1.4),
        ),
        const SizedBox(height: 12),
        WebInput(
          controller: _reason,
          hint: 'Sababni batafsil yozing...',
          maxLines: 4,
          minLines: 3,
        ),
        if (widget.withDeadline) ...[
          const SizedBox(height: 12),
          const WebLabel('Yangi muddat (sana va vaqt)'),
          WebInput(
            readOnly: true,
            hint: 'Sana va vaqtni tanlang',
            controller: TextEditingController(
              text: _deadline == null ? '' : shortDateTime(_deadline!),
            ),
            onTap: () async {
              final d = await pickDateTime(context, initial: _deadline);
              if (d != null) setState(() => _deadline = d);
            },
            suffix: TIcon(TI.event_rounded, size: 16, color: WebC.zinc300),
          ),
        ],
        FlashStatus(
          message: _err,
          trigger: _errF.seq,
          builder: (_, m) => Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(m, style: TextStyle(color: WebC.red, fontSize: 13)),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            WebButton(
              label: 'Bekor',
              variant: WebBtn.ghost,
              onPressed: () => Navigator.of(context).pop(),
            ),
            const SizedBox(width: 8),
            WebButton(label: 'Yuboriş', onPressed: _submit),
          ],
        ),
      ],
    );
  }
}
