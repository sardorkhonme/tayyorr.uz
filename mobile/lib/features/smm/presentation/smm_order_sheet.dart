import 'package:tayyorr_app/core/ui/ticons.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/ui/app_dialogs.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/web_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../wallet/presentation/wallet_screen.dart';
import '../data/smm_api.dart';
import '../data/smm_models.dart';
import 'smm_widgets.dart';

/// Xizmatni tanlaganda — buyurtma oynasi (saytdagi OrderDialog).
Future<void> showSmmOrderSheet(BuildContext context, SmmService s, SmmCatalog catalog, {VoidCallback? onOrdersTap}) {
  final p = catalog.platform(s.platform);
  final k = catalog.kind(s.kind);
  // tepada qotib turadi: platforma belgisi, "Platforma · tur" va X
  return showAppSheet(
    context,
    leading: PlatformBadge(p, size: 40),
    title: '${p.name} · ${k.label}',
    builder: (ctx) => _OrderForm(s: s, catalog: catalog, onOrdersTap: onOrdersTap),
  );
}

class _OrderForm extends StatefulWidget {
  const _OrderForm({required this.s, required this.catalog, this.onOrdersTap});
  final SmmService s;
  final SmmCatalog catalog;
  final VoidCallback? onOrdersTap;

  @override
  State<_OrderForm> createState() => _OrderFormState();
}

class _OrderFormState extends State<_OrderForm> {
  final _link = TextEditingController();
  late final _qty = TextEditingController(text: '${widget.s.min}');
  Timer? _debounce;
  ({bool ok, String text})? _linkCheck;
  bool _busy = false;
  String? _error;
  bool _done = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _link.dispose();
    _qty.dispose();
    super.dispose();
  }

  int get _q => int.tryParse(_qty.text) ?? 0;
  bool get _qtyOk => _q >= widget.s.min && _q <= widget.s.max;

  void _onLink(String v) {
    _debounce?.cancel();
    setState(() => _linkCheck = null);
    if (v.trim().length < 2) return;
    _debounce = Timer(const Duration(milliseconds: 450), () async {
      try {
        final r = await SmmApi.instance.checkLink(widget.s.id, v.trim());
        if (mounted && _link.text == v) setState(() => _linkCheck = r);
      } catch (_) {}
    });
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await SmmApi.instance.placeOrder(widget.s.id, _link.text.trim(), _q);
      if (!mounted) return;
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      setState(() {
        _busy = false;
        _done = true;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_done) return _success();
    final s = widget.s;
    final p = widget.catalog.platform(s.platform);
    final balance = context.select<AuthBloc, int>((b) => b.state.user?.balance ?? 0);
    final charge = _qtyOk ? s.chargeFor(_q) : 0;
    final enough = balance >= charge;
    final linkOk = _linkCheck?.ok ?? false;
    final presets = {s.min, 100, 500, 1000, 5000, 10000}.where((n) => n >= s.min && n <= s.max).take(5).toList()..sort();

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Text(s.title, style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w800, height: 1.3))),
        if (s.discount > 0) ...[const SizedBox(width: 8), DiscountBadge(s.discount, big: true)],
      ]),
      const SizedBox(height: 8),
      Wrap(spacing: 6, runSpacing: 6, children: [
        GuaranteeBadge(label: s.guaranteeLabel, ok: s.guaranteeOk),
        VerdictBadge(ok: s.recommended),
        for (final t in s.tags.take(6)) SmmTag(t),
      ]),
      const SizedBox(height: 8),
      Text(s.verdictReason, style: TextStyle(color: WebC.zinc500, fontSize: 12.5)),
      if (s.kind == 'followers' && !s.guaranteeOk) ...[
        const SizedBox(height: 10),
        _note(TI.warning_amber_rounded, const Color(0xFFF59E0B),
            "Kafolatsiz obunaçilar vaqt öti bilan kamayişi mumkin va qaytmaydi. Kafolatli (♻️) xizmatni tanlaş tavsiya etiladi."),
      ],
      if ((s.description ?? '').trim().isNotEmpty) ...[
        const SizedBox(height: 10),
        Container(
          constraints: const BoxConstraints(maxHeight: 120),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: WebC.fill5, borderRadius: BorderRadius.circular(14)),
          child: SingleChildScrollView(
            child: Text(s.description!.trim(), style: TextStyle(color: WebC.zinc400, fontSize: 13, height: 1.45)),
          ),
        ),
      ],
      const SizedBox(height: 16),
      const WebLabel('Havolani kiriting'),
      WebInput(controller: _link, hint: p.linkHint, keyboardType: TextInputType.url, onChanged: _onLink),
      if (_linkCheck != null) ...[
        const SizedBox(height: 6),
        Text(
          _linkCheck!.ok ? 'Yuboriladi: ${_linkCheck!.text}' : _linkCheck!.text,
          style: TextStyle(color: _linkCheck!.ok ? WebC.emerald : WebC.amber, fontSize: 12.5),
        ),
      ],
      const SizedBox(height: 14),
      WebLabel('Neçta kerak? (${groupDigits(s.min)} – ${groupDigits(s.max)})'),
      WebInput(
        controller: _qty,
        keyboardType: TextInputType.number,
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 8),
      Wrap(spacing: 6, runSpacing: 6, children: [
        for (final n in presets)
          GestureDetector(
            onTap: () => setState(() => _qty.text = '$n'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _q == n ? WebC.indigoFill : WebC.fill5,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: _q == n ? const Color(0xFF818CF8) : WebC.border),
              ),
              child: Text(groupDigits(n), style: TextStyle(color: _q == n ? WebC.white : WebC.zinc300, fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ),
      ]),
      if (!_qtyOk && _qty.text.isNotEmpty) ...[
        const SizedBox(height: 6),
        Text('${groupDigits(s.min)} dan ${groupDigits(s.max)} gaça son kiriting', style: TextStyle(color: WebC.amber, fontSize: 12.5)),
      ],
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WebC.fill5, borderRadius: BorderRadius.circular(16), border: Border.all(color: WebC.border)),
        child: Column(children: [
          _row('Narx (har 1000 tasi)', s.oldRate != null ? '${som(s.rate)}  (${groupDigits(s.oldRate!)})' : som(s.rate)),
          _row('Hamyoningizda', som(balance)),
          Divider(color: WebC.border, height: 18),
          _row('Tölanadi', som(charge), bold: true),
        ]),
      ),
      if (_qtyOk && !enough) ...[
        const SizedBox(height: 10),
        _note(TI.account_balance_wallet_outlined, const Color(0xFFF59E0B), 'Mablağ yetarli emas. Avval hamyonni töldiring.'),
        const SizedBox(height: 8),
        AppDialogButton(
          label: 'Hamyonni töldiriş',
          primary: false,
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const StandaloneWallet())),
        ),
      ],
      if (_error != null) ...[
        const SizedBox(height: 10),
        Text(_error!, style: TextStyle(color: WebC.red, fontSize: 13.5, height: 1.4)),
      ],
      const SizedBox(height: 14),
      AppDialogButton(
        label: 'Buyurtma beriş',
        busy: _busy,
        onTap: _qtyOk && enough && linkOk ? _submit : null,
      ),
    ]);
  }

  Widget _success() => Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 8),
        Container(
          width: 76,
          height: 76,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
          ),
          child: const TIcon(TI.check_rounded, color: Colors.white, size: 38),
        ),
        const SizedBox(height: 16),
        Text('Buyurtma qabul qilindi!', style: TextStyle(color: AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text("Holatini «Buyurtmalarim» bölimida kuzatib boriş mumkin. Bajarilmasa — pul avtomatik qaytadi.",
            textAlign: TextAlign.center, style: TextStyle(color: WebC.zinc500, fontSize: 14, height: 1.45)),
        const SizedBox(height: 20),
        Row(children: [
          Expanded(child: AppDialogButton(label: 'Yopiş', primary: false, onTap: () => Navigator.of(context).pop())),
          const SizedBox(width: 10),
          Expanded(
            child: AppDialogButton(
              label: 'Buyurtmalarim',
              onTap: () {
                Navigator.of(context).pop();
                widget.onOrdersTap?.call();
              },
            ),
          ),
        ]),
      ]);

  Widget _row(String a, String b, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Text(a, style: TextStyle(color: WebC.zinc400, fontSize: 13.5)),
          const Spacer(),
          Text(b, style: TextStyle(color: WebC.white, fontSize: bold ? 16 : 13.5, fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        ]),
      );

  Widget _note(TIData icon, Color c, String text) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14), border: Border.all(color: c.withValues(alpha: 0.3))),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          TIcon(icon, color: c, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(color: WebC.zinc300, fontSize: 13, height: 1.4))),
        ]),
      );
}

/// Faqat raqam (miqdor maydoni uchun).
final digitsOnly = [FilteringTextInputFormatter.digitsOnly];
