import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../cubit/wallet_cubit.dart';
import '../data/wallet_model.dart';
import '../data/wallet_repository.dart';

const _starPrice = 2000;

/// Saytdagi /wallet — balans, ⭐ Star, to'ldirish, yechish va tarix.
class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => WalletCubit(WalletRepository())..load(),
      child: const _WalletView(),
    );
  }
}

class _WalletView extends StatelessWidget {
  const _WalletView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<WalletCubit, WalletState>(
      builder: (context, state) {
        final wallet = state.wallet;
        final isPreparer = context.select((AuthBloc b) => b.state.user?.isPreparer ?? false);
        final reload = context.read<WalletCubit>().load;

        final List<Widget> body;
        if (wallet == null && state.status == WalletStatus.failure) {
          body = [
            Padding(
              padding: const EdgeInsets.only(top: 40),
              child: Center(child: Text(state.error ?? 'Xatolik', style: TextStyle(color: WebC.zinc500))),
            ),
          ];
        } else if (wallet == null) {
          body = const [SBlock(height: 150), SBlock(height: 300), SBlock(height: 260)];
        } else {
          body = [
            _BalanceCard(wallet: wallet),
            if (isPreparer) _BuyStarsForm(starBalance: wallet.starBalance, onDone: reload),
            _TopUpForm(myCode: wallet.walletCode),
            _PayoutForm(balance: wallet.balance, onDone: reload),
            if (wallet.payouts.isNotEmpty)
              _Section(
                title: "Yechib olishlar",
                children: [for (final p in wallet.payouts) _PayoutRow(payout: p, onCancelled: reload)],
              ),
            _Section(
              title: 'Amallar tarixi',
              children: wallet.transactions.isEmpty
                  ? [
                      WebCard(
                        child: Text("Hozircha amallar yo'q.", style: TextStyle(color: WebC.zinc500, fontSize: 14)),
                      ),
                    ]
                  : [for (final t in wallet.transactions) _TxnRow(txn: t)],
            ),
          ];
        }

        return WebPage(
          background: false,
          onRefresh: reload,
          gap: 32,
          children: [
            const WebPageTitle(
              'Hamyon',
              size: 24,
              subtitle: "Hisobingizni to'ldiring, buyurtmalar uchun shu balansdan to'lov qilinadi.",
            ),
            ...body,
          ],
        );
      },
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          children[i],
        ],
      ],
    );
  }
}

/// Karta sarlavhasi + o'ng tomondagi kichik nishon.
class _FormHead extends StatelessWidget {
  const _FormHead({required this.title, this.tag, this.tagColor, this.tagBg});
  final String title;
  final String? tag;
  final Color? tagColor;
  final Color? tagBg;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
        ),
        if (tag != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: tagBg ?? WebC.fill5, borderRadius: BorderRadius.circular(4)),
            child: Text(tag!,
                style: TextStyle(color: tagColor ?? WebC.zinc300, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
      ],
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: TextStyle(color: WebC.zinc500, fontSize: 12, height: 1.4));
}

class _Msg extends StatelessWidget {
  const _Msg({required this.ok, required this.text});
  final bool ok;
  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: TextStyle(color: ok ? WebC.emerald : WebC.red, fontSize: 14));
}

/// Saytdagi tez tanlash tugmachasi (`rounded-lg border bg-white/5 text-xs`).
class _Quick extends StatelessWidget {
  const _Quick({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: WebC.fill5,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: WebC.border),
        ),
        child: Text(label, style: TextStyle(color: WebC.zinc300, fontSize: 12)),
      ),
    );
  }
}

// ── Balans ──────────────────────────────────────────────────────────

/// Yashirish holati ilova ishlayotgan vaqt davomida saqlanadi.
bool _balanceHidden = false;

class _BalanceCard extends StatefulWidget {
  const _BalanceCard({required this.wallet});
  final WalletModel wallet;

  @override
  State<_BalanceCard> createState() => _BalanceCardState();
}

class _BalanceCardState extends State<_BalanceCard> {
  int _run = 0;
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.wallet.walletCode));
    if (!mounted) return;
    setState(() => _copied = true);
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final light = AppColors.isLight;
    final w = widget.wallet;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
        child: Container(
          decoration: BoxDecoration(
            color: light ? Colors.white.withValues(alpha: 0.7) : Colors.white.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: light ? Colors.black.withValues(alpha: 0.08) : Colors.white.withValues(alpha: 0.12)),
          ),
          child: Stack(
            children: [
              Positioned(
                top: -128,
                right: -96,
                child: IgnorePointer(
                  child: Container(
                    width: 352,
                    height: 352,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          const Color(0xFF6366F1).withValues(alpha: 0.35),
                          const Color(0xFF6366F1).withValues(alpha: 0),
                        ],
                        stops: const [0, 0.7],
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Joriy balans', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: _balanceHidden
                                ? Text('•••••', style: _amountStyle)
                                : TweenAnimationBuilder<double>(
                                    key: ValueKey('${w.balance}-$_run'),
                                    tween: Tween(begin: 0, end: w.balance.toDouble()),
                                    duration: const Duration(milliseconds: 900),
                                    curve: Curves.easeOutCubic,
                                    builder: (_, v, __) => Text(formatSom(v.round()), style: _amountStyle),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => setState(() {
                            _balanceHidden = !_balanceHidden;
                            if (!_balanceHidden) _run++;
                          }),
                          child: Icon(
                            _balanceHidden ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 18,
                            color: WebC.zinc500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: WebC.fill5,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: WebC.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Hisob kodi:', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
                          const SizedBox(width: 8),
                          Text(w.walletCode,
                              style: TextStyle(
                                  color: WebC.white, fontSize: 14, fontWeight: FontWeight.w500, fontFamily: 'monospace')),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: _copy,
                            child: _copied
                                ? Text('nusxa olindi', style: TextStyle(color: WebC.emerald, fontSize: 12))
                                : Icon(Icons.copy_rounded, size: 16, color: WebC.zinc400),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  TextStyle get _amountStyle => TextStyle(
        color: WebC.white,
        fontSize: 36,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.8,
        fontFeatures: const [FontFeature.tabularFigures()],
      );
}

// ── ⭐ Star ─────────────────────────────────────────────────────────

class _BuyStarsForm extends StatefulWidget {
  const _BuyStarsForm({required this.starBalance, required this.onDone});
  final int starBalance;
  final Future<void> Function() onDone;

  @override
  State<_BuyStarsForm> createState() => _BuyStarsFormState();
}

class _BuyStarsFormState extends State<_BuyStarsForm> {
  final _stars = TextEditingController();
  bool _busy = false;
  (bool, String)? _msg;

  @override
  void dispose() {
    _stars.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final n = int.tryParse(_stars.text.trim()) ?? 0;
    if (n <= 0) {
      setState(() => _msg = (false, 'Star sonini kiriting'));
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await WalletRepository().buyStars(n);
      if (!mounted) return;
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      setState(() => _msg = (true, '$n ⭐ sotib olindi!'));
      _stars.clear();
      widget.onDone();
    } on ApiException catch (e) {
      setState(() => _msg = (false, e.message));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final n = int.tryParse(_stars.text.trim()) ?? 0;
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _FormHead(
            title: '⭐ Star',
            tag: '${widget.starBalance} ⭐ mavjud',
            tagColor: WebC.amber,
            tagBg: const Color(0xFFF59E0B).withValues(alpha: 0.15),
          ),
          const SizedBox(height: 8),
          _Hint("Buyurtmaga ariza yuborish va navbatda yuqoriga chiqish uchun kerak bo'ladi. "
              "1 ⭐ = ${groupDigits(_starPrice)} so'm, hamyon balansingizdan yechiladi."),
          const SizedBox(height: 16),
          const WebLabel('Nechta star (dona)'),
          WebInput(
            controller: _stars,
            hint: '10',
            keyboardType: TextInputType.number,
            onChanged: (_) => setState(() {}),
          ),
          if (n > 0) ...[
            const SizedBox(height: 4),
            _Hint("Narxi: ${groupDigits(n * _starPrice)} so'm"),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final q in const [5, 10, 25, 50])
                _Quick(label: '$q ⭐', onTap: () => setState(() => _stars.text = '$q')),
            ],
          ),
          if (_msg != null) ...[const SizedBox(height: 16), _Msg(ok: _msg!.$1, text: _msg!.$2)],
          const SizedBox(height: 16),
          WebButton(label: _busy ? '...' : 'Star sotib olish', onPressed: _busy ? null : _submit, expand: true),
        ],
      ),
    );
  }
}

// ── To'ldirish ──────────────────────────────────────────────────────

class _TopUpForm extends StatefulWidget {
  const _TopUpForm({required this.myCode});
  final String myCode;

  @override
  State<_TopUpForm> createState() => _TopUpFormState();
}

class _TopUpFormState extends State<_TopUpForm> {
  late final _code = TextEditingController(text: widget.myCode);
  final _amount = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = int.tryParse(_amount.text.trim());
    if (amount == null) {
      setState(() => _error = 'Summani kiriting');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final payUrl = await WalletRepository().topUp(amount, walletCode: _code.text.trim());
      final ok = await launchUrl(Uri.parse(payUrl), mode: LaunchMode.externalApplication);
      if (!ok && mounted) setState(() => _error = "To'lov sahifasini ochib bo'lmadi");
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _FormHead(title: "Hisobni to'ldirish", tag: 'Click orqali'),
          const SizedBox(height: 8),
          const _Hint("Summani kiriting — Click'ning xavfsiz to'lov sahifasiga yo'naltirilasiz. "
              "Karta ma'lumotlari saytimizda saqlanmaydi."),
          const SizedBox(height: 16),
          const WebLabel('Hisob kodi (kimning hisobiga)'),
          WebInput(
            controller: _code,
            hint: 'TYR-XXXX',
            mono: true,
            onChanged: (v) {
              final up = v.toUpperCase();
              if (up != v) {
                _code.value = _code.value.copyWith(text: up, selection: TextSelection.collapsed(offset: up.length));
              }
            },
          ),
          const SizedBox(height: 4),
          _Hint("O'zingizniki: ${widget.myCode}"),
          const SizedBox(height: 16),
          const WebLabel("Summa (so'm)"),
          WebInput(controller: _amount, hint: '50000', keyboardType: TextInputType.number),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final q in const [20000, 50000, 100000, 300000])
                _Quick(label: '+${groupDigits(q)}', onTap: () => _amount.text = '$q'),
            ],
          ),
          if (_error != null) ...[const SizedBox(height: 16), _Msg(ok: false, text: _error!)],
          const SizedBox(height: 16),
          WebButton(
            label: _busy ? '...' : "Click orqali to'lash",
            onPressed: _busy ? null : _submit,
            expand: true,
          ),
        ],
      ),
    );
  }
}

// ── Yechib olish ────────────────────────────────────────────────────

class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final cut = digits.length > 16 ? digits.substring(0, 16) : digits;
    final buf = StringBuffer();
    for (var i = 0; i < cut.length; i++) {
      if (i > 0 && i % 4 == 0) buf.write(' ');
      buf.write(cut[i]);
    }
    final text = buf.toString();
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

class _PayoutForm extends StatefulWidget {
  const _PayoutForm({required this.balance, required this.onDone});
  final int balance;
  final Future<void> Function() onDone;

  @override
  State<_PayoutForm> createState() => _PayoutFormState();
}

class _PayoutFormState extends State<_PayoutForm> {
  final _card = TextEditingController();
  final _cardName = TextEditingController();
  final _amount = TextEditingController();
  bool _busy = false;
  (bool, String)? _msg;

  @override
  void dispose() {
    _card.dispose();
    _cardName.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final digits = _card.text.replaceAll(RegExp(r'\D'), '');
    final amount = int.tryParse(_amount.text.trim());
    if (digits.isEmpty || amount == null) {
      setState(() => _msg = (false, "Karta raqami va summani kiriting"));
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await WalletRepository().payout(amount: amount, card: _card.text, cardName: _cardName.text.trim());
      if (!mounted) return;
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      setState(() => _msg = (true, "Mablag' hisobdan yechildi va tez orada kartangizga o'tkaziladi."));
      _card.clear();
      _cardName.clear();
      _amount.clear();
      widget.onDone();
    } on ApiException catch (e) {
      if (mounted) setState(() => _msg = (false, e.message));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Kartaga yechib olish', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          _Hint("Mablag' darhol hisobdan yechiladi va kartangizga o'tkaziladi. "
              "Mavjud: ${groupDigits(widget.balance)} so'm."),
          const SizedBox(height: 12),
          const WebLabel('Karta raqami'),
          TextField(
            controller: _card,
            keyboardType: TextInputType.number,
            inputFormatters: [_CardNumberFormatter()],
            style: TextStyle(
              color: AppColors.isLight ? const Color(0xFF1B1B1F) : const Color(0xFFE4E4E7),
              fontSize: 14,
              height: 1.5,
              fontFamily: 'monospace',
              letterSpacing: 1.4,
            ),
            decoration: webInputDecoration(hint: '8600 0000 0000 0000'),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [const WebLabel('Karta egasi (ixtiyoriy)'), WebInput(controller: _cardName)],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const WebLabel("Summa (so'm)"),
                    WebInput(controller: _amount, keyboardType: TextInputType.number),
                  ],
                ),
              ),
            ],
          ),
          if (_msg != null) ...[const SizedBox(height: 12), _Msg(ok: _msg!.$1, text: _msg!.$2)],
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: WebButton(label: _busy ? '...' : 'Yechib olish', onPressed: _busy ? null : _submit),
          ),
        ],
      ),
    );
  }
}

// ── Ro'yxatlar ──────────────────────────────────────────────────────

class _PayoutRow extends StatefulWidget {
  const _PayoutRow({required this.payout, required this.onCancelled});
  final PayoutModel payout;
  final Future<void> Function() onCancelled;

  @override
  State<_PayoutRow> createState() => _PayoutRowState();
}

class _PayoutRowState extends State<_PayoutRow> {
  bool _busy = false;

  Future<void> _cancel() async {
    setState(() => _busy = true);
    try {
      await WalletRepository().cancelPayout(widget.payout.id);
      if (!mounted) return;
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      await widget.onCancelled();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.payout;
    final statusColor = switch (p.status) {
      'PAID' => WebC.emerald,
      'PENDING' => const Color(0xFFFBBF24),
      _ => WebC.zinc500,
    };
    return WebCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(
                  TextSpan(children: [
                    TextSpan(text: formatSom(p.amount)),
                    TextSpan(
                      text: '  ${kPayoutStatusLabel[p.status] ?? p.status}',
                      style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w400),
                    ),
                  ]),
                  style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 2),
                Text(
                  '${shortDateTime(p.createdAt)}${(p.adminNote ?? '').isNotEmpty ? ' · ${p.adminNote}' : ''}',
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
              ],
            ),
          ),
          if (p.status == 'PENDING') ...[
            const SizedBox(width: 12),
            WebButton(
              label: _busy ? '...' : 'Bekor qilish',
              variant: WebBtn.ghost,
              small: true,
              onPressed: _busy ? null : _cancel,
            ),
          ],
        ],
      ),
    );
  }
}

class _TxnRow extends StatelessWidget {
  const _TxnRow({required this.txn});
  final WalletTransactionModel txn;

  @override
  Widget build(BuildContext context) {
    final out = txn.reversed || kOutflowTypes.contains(txn.type);
    final amountColor = txn.reversed ? WebC.red : (out ? WebC.zinc300 : WebC.emerald);
    return WebCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      onTap: () => _showReceipt(context, txn),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  children: [
                    Text(kTxnTypeLabel[txn.type] ?? txn.type,
                        style: TextStyle(color: WebC.white, fontSize: 14, fontWeight: FontWeight.w500)),
                    if (txn.method == 'DEMO') _tag('DEMO', const Color(0xFFFCD34D), const Color(0xFFF59E0B)),
                    if (txn.reversed) _tag('BEKOR QILINGAN', const Color(0xFFF87171), const Color(0xFFEF4444)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${shortDateTime(txn.createdAt)}${(txn.note ?? '').isNotEmpty ? ' · ${txn.note}' : ''}',
                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '${out ? '−' : '+'}${formatSom(txn.amount)}',
            style: TextStyle(
              color: amountColor,
              fontSize: 14,
              fontWeight: FontWeight.w600,
              decoration: txn.reversed ? TextDecoration.lineThrough : null,
              decorationColor: amountColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _tag(String text, Color fg, Color bg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: bg.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
        child: Text(text, style: TextStyle(color: fg, fontSize: 10, fontWeight: FontWeight.w600)),
      );
}

void _showReceipt(BuildContext context, WalletTransactionModel txn) {
  final out = txn.reversed || kOutflowTypes.contains(txn.type);
  final rows = <(String, String)>[
    ('Summa', '${out ? '−' : '+'}${formatSom(txn.amount)}'),
    (
      'Holat',
      txn.reversed
          ? 'Bekor qilingan'
          : switch (txn.status) {
              'PENDING' => 'Kutilmoqda',
              'FAILED' => 'Muvaffaqiyatsiz',
              'CANCELLED' => 'Bekor qilingan',
              _ => 'Bajarildi',
            }
    ),
    ('Usul', txn.method),
    if ((txn.note ?? '').isNotEmpty) ('Izoh', txn.note!),
    ('Sana', shortDateTime(txn.createdAt)),
  ];
  showWebDialog(
    context,
    builder: (_) => Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(kTxnTypeLabel[txn.type] ?? txn.type,
            style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        for (final r in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(width: 90, child: Text(r.$1, style: TextStyle(color: WebC.zinc500, fontSize: 13))),
                Expanded(child: Text(r.$2, style: TextStyle(color: WebC.white, fontSize: 13))),
              ],
            ),
          ),
      ],
    ),
  );
}
