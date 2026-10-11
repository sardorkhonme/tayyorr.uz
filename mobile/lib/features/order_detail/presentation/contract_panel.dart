import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/date_time_picker.dart';
import '../../../widgets/web_ui.dart';
import '../cubit/order_detail_cubit.dart';
import '../data/order_detail_model.dart';

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
    final pending = c.cancelState == 'PENDING';
    final disputed = c.cancelState == 'DISPUTED';
    final iRequested = pending && c.cancelRequestedById == meId;
    final otherRequested = pending && !iRequested;
    final requester = c.cancelRequestedById == null
        ? ''
        : c.cancelRequestedById == meId
            ? 'Siz'
            : (isOrderer ? 'Tayyorlovchi' : 'Buyurtmachi');
    final som = "${groupDigits(c.amount)} so'm";

    Future<void> askReason(String action, String title, String help) async {
      final reason = await showWebDialog<String>(
        context,
        builder: (_) => _ReasonDialog(title: title, help: help),
      );
      if (reason != null) await cubit.respondToContract(c.id, action: action, reason: reason);
    }

    Future<void> askRevision() async {
      final res = await showWebDialog<(String, DateTime)>(
        context,
        builder: (_) => _ReasonDialog(
          title: 'Nimani qayta ishlash kerak?',
          help: "Ish tayyorlovchiga qaytadi. Yangi muddatgacha qayta topshirilmasa — shartnoma bekor bo'lib pul sizga qaytadi.",
          withDeadline: true,
          initialDeadline: c.deadline,
        ),
      );
      if (res != null) await cubit.requestRevision(reason: res.$1, deadline: res.$2);
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: AppColors.isLight ? 0.08 : 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF34D399).withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('📄 Shartnoma imzolangan', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          _rich('Summa: ', som, isOrderer ? ' · tayyorlovchi: ${c.preparerName}' : ''),
          if (c.deadline != null) ...[
            const SizedBox(height: 2),
            _rich('Topshirish muddati: ', shortDateTime(c.deadline!),
                c.revisionCount > 0 ? ' · qayta ishlash: ${c.revisionCount} marta' : '', muted: true),
          ],
          if (delivered && c.reviewDueAt != null) ...[
            const SizedBox(height: 8),
            _note(
              "📦 Ish topshirilgan${c.deliveredAt != null ? ' (${shortDateTime(c.deliveredAt!)})' : ''}. "
              "${isOrderer ? 'Tekshirib javob bering' : 'Buyurtmachi tekshirmoqda'} — ${shortDateTime(c.reviewDueAt!)} "
              "gacha javob bo'lmasa, ish muvaffaqiyatli deb topiladi va pul tayyorlovchiga o'tadi.",
            ),
          ],
          if (!delivered && c.cancelState == null) ...[
            const SizedBox(height: 8),
            Text(
              "Muddat tugaguncha ish topshirilmasa, shartnoma bekor bo'ladi va pul buyurtmachiga qaytadi.",
              style: TextStyle(color: WebC.zinc500, fontSize: 12, height: 1.4),
            ),
          ],

          // bekor qilish so'rovi
          if (pending) ...[
            const SizedBox(height: 12),
            _Box(
              color: const Color(0xFFF59E0B),
              children: [
                Text("⚠️ $requester bekor qilishni so'ra${requester == 'Siz' ? 'dingiz' : 'di'}",
                    style: const TextStyle(color: Color(0xFFFCD34D), fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('Sabab: ${c.cancelReason ?? ''}', style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.4)),
                if (c.cancelDueAt != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    "${iRequested ? 'Ikkinchi tomon' : 'Siz'} ${shortDateTime(c.cancelDueAt!)} gacha javob "
                    "${iRequested ? 'beradi' : 'bering'}. Javob bo'lmasa — rozi deb hisoblanadi va pul buyurtmachiga qaytariladi.",
                    style: TextStyle(color: WebC.zinc400, fontSize: 12, height: 1.4),
                  ),
                ],
                const SizedBox(height: 12),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  if (otherRequested) ...[
                    WebButton(
                      label: 'Roziman — bekor qilinsin',
                      onPressed: busy
                          ? null
                          : () async {
                              final ok = await confirmDialog(
                                context,
                                title: 'Bekor qilinsinmi?',
                                message: "Shartnoma bekor qilinadi va $som buyurtmachiga qaytariladi. Rozimisiz?",
                                confirmLabel: 'Roziman',
                                cancelLabel: "Yo'q",
                              );
                              if (ok == true) cubit.respondToContract(c.id, action: 'APPROVE_CANCEL');
                            },
                    ),
                    WebButton(
                      label: 'Rozi emasman',
                      variant: WebBtn.ghost,
                      onPressed: busy
                          ? null
                          : () => askReason('REJECT_CANCEL', 'Nega rozi emassiz?',
                              "Sabab admin va ikkinchi tomonga ko'rinadi. Masalani admin hal qiladi."),
                    ),
                  ],
                  if (iRequested)
                    WebButton(
                      label: "So'rovni qaytarib olish",
                      variant: WebBtn.ghost,
                      onPressed: busy ? null : () => cubit.respondToContract(c.id, action: 'WITHDRAW_CANCEL'),
                    ),
                ]),
              ],
            ),
          ],

          if (disputed) ...[
            const SizedBox(height: 12),
            _Box(
              color: const Color(0xFFEF4444),
              children: [
                Text("⚖️ Masala administrator ko'rib chiqmoqda",
                    style: TextStyle(color: WebC.redSoft, fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('Bekor qilish sababi: ${c.cancelReason ?? ''}',
                    style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.4)),
                Text('Rad etish sababi: ${c.cancelRejectReason ?? ''}',
                    style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.4)),
                const SizedBox(height: 4),
                Text("Admin bekor qilish, davom ettirish yoki yakunlash bo'yicha qaror qabul qiladi. Qaror chatga yoziladi.",
                    style: TextStyle(color: WebC.zinc400, fontSize: 12, height: 1.4)),
              ],
            ),
          ],

          // asosiy amallar
          if (!disputed) ...[
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (isOrderer)
                WebButton(
                  label: '✅ Ishni yakunlash',
                  onPressed: busy
                      ? null
                      : () async {
                          final ok = await confirmDialog(
                            context,
                            title: 'Ish yakunlansinmi?',
                            message: "Ish yakunlanadi va $som to'liq tayyorlovchiga o'tadi.",
                            confirmLabel: 'Yakunlash',
                            cancelLabel: 'Bekor',
                          );
                          if (ok == true) cubit.finalizeOrder();
                        },
                ),
              if (isOrderer && delivered && c.cancelState == null)
                WebButton(label: '🔁 Qayta ishlash', variant: WebBtn.ghost, onPressed: busy ? null : askRevision),
              if (!isOrderer && order.status == 'IN_PROGRESS')
                WebButton(label: '📦 Ishni topshirdim', onPressed: busy ? null : () => cubit.setStatus('DELIVERED')),
              if (c.cancelState == null)
                WebButton(
                  label: "✖ Bekor qilishni so'rash",
                  variant: WebBtn.ghost,
                  onPressed: busy
                      ? null
                      : () => askReason(
                            'REQUEST_CANCEL',
                            'Bekor qilish sababi',
                            "Ikkinchi tomonga yuboriladi. U 3 ish kuni ichida rozi bo'lsa (yoki javob bermasa) — pul buyurtmachiga qaytadi, rozi bo'lmasa — admin hal qiladi.",
                          ),
                ),
            ]),
          ],
        ],
      ),
    );
  }

  Widget _rich(String a, String b, String tail, {bool muted = false}) => Text.rich(TextSpan(
        style: TextStyle(color: muted ? WebC.zinc400 : WebC.zinc300, fontSize: 14, height: 1.4),
        children: [
          TextSpan(text: a),
          TextSpan(text: b, style: TextStyle(color: WebC.white, fontWeight: FontWeight.w700)),
          TextSpan(text: tail),
        ],
      ));

  Widget _note(String text) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: AppColors.tint(0.04), borderRadius: BorderRadius.circular(8)),
        child: Text(text, style: TextStyle(color: WebC.zinc400, fontSize: 12, height: 1.4)),
      );
}

class _Box extends StatelessWidget {
  const _Box({required this.color, required this.children});
  final Color color;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.32)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
      );
}

/// Sabab (va qayta ishlashda — yangi muddat) so'raydigan oyna.
/// Natija: String (sabab) yoki (String, DateTime) — withDeadline bo'lsa.
class _ReasonDialog extends StatefulWidget {
  const _ReasonDialog({required this.title, required this.help, this.withDeadline = false, this.initialDeadline});
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
  String? _err;

  @override
  void initState() {
    super.initState();
    final d = widget.initialDeadline;
    if (widget.withDeadline && d != null && d.isAfter(DateTime.now().add(const Duration(hours: 1)))) _deadline = d;
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
      if (_deadline == null || !_deadline!.isAfter(DateTime.now().add(const Duration(minutes: 30)))) {
        setState(() => _err = 'Yangi muddatni (sana va vaqt) tanlang — kamida 30 daqiqadan keyin');
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
        Text(widget.title, style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(widget.help, style: TextStyle(color: WebC.zinc400, fontSize: 12, height: 1.4)),
        const SizedBox(height: 12),
        WebInput(controller: _reason, hint: 'Sababni batafsil yozing...', maxLines: 4, minLines: 3),
        if (widget.withDeadline) ...[
          const SizedBox(height: 12),
          const WebLabel('Yangi muddat (sana va vaqt)'),
          WebInput(
            readOnly: true,
            hint: 'Sana va vaqtni tanlang',
            controller: TextEditingController(text: _deadline == null ? '' : shortDateTime(_deadline!)),
            onTap: () async {
              final d = await pickDateTime(context, initial: _deadline);
              if (d != null) setState(() => _deadline = d);
            },
            suffix: Icon(Icons.event_rounded, size: 16, color: WebC.zinc300),
          ),
        ],
        if (_err != null) ...[
          const SizedBox(height: 10),
          Text(_err!, style: TextStyle(color: WebC.red, fontSize: 13)),
        ],
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            WebButton(label: 'Bekor', variant: WebBtn.ghost, onPressed: () => Navigator.of(context).pop()),
            const SizedBox(width: 8),
            WebButton(label: 'Yuborish', onPressed: _submit),
          ],
        ),
      ],
    );
  }
}
