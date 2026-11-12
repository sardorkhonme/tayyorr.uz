import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tayyorr_app/core/ui/ticons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/navigation/services.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/ui/app_dialogs.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/web_ui.dart';
import '../../legal/legal_screen.dart';
import '../data/wallet_repository.dart';

/// Hamyonni to'ldirish — barcha xizmatlar uchun yagona to'lov sahifasi (saytdagi plus.tayyorr.uz/pay kabi):
/// summa, tez tanlov, to'lov usuli (Click; Payme va Uzum — tez orada). To'lov Click sahifasida
/// (ilova ichidagi oynada) amalga oshadi, qaytgach balans o'zi yangilanadi.
class PayScreen extends StatefulWidget {
  const PayScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(
    context,
  ).push(MaterialPageRoute(builder: (_) => const PayScreen()));

  @override
  State<PayScreen> createState() => _PayScreenState();
}

const _min = 1000;
const _max = 10000000;
const _quick = [10000, 25000, 50000, 100000, 200000, 500000];

class _PayScreenState extends State<PayScreen> {
  final _amount = TextEditingController();
  String _method = 'click';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  int get _n => int.tryParse(_amount.text.replaceAll(RegExp(r'\D'), '')) ?? 0;

  void _set(int v) => setState(() {
    _amount.text = groupDigits(v);
    _amount.selection = TextSelection.collapsed(offset: _amount.text.length);
    _error = null;
  });

  Future<void> _pay() async {
    final n = _n;
    if (n < _min || n > _max) {
      setState(
        () => _error =
            '${groupDigits(_min)} dan ${groupDigits(_max)} sömgaça summa kiriting',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final url = await WalletRepository().topUp(n);
      var ok = await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.inAppBrowserView,
      );
      if (!ok) {
        ok = await launchUrl(
          Uri.parse(url),
          mode: LaunchMode.externalApplication,
        );
      }
      if (!mounted) return;
      if (!ok) {
        setState(() => _error = 'Tölov sahifasini oçib bölmadi');
      } else {
        showToast(
          context,
          'Tölov tekşirilmoqda — balans bir neça soniyada yangilanadi',
          kind: ToastKind.info,
        );
        Navigator.of(context).maybePop();
      }
    } catch (e) {
      if (mounted) setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String get _platform => switch (currentService.value) {
    ServiceKind.uz => 'Tayyorr.uz',
    ServiceKind.smm => 'Tayyorr SMM',
    ServiceKind.plus => 'tayyorr+',
  };

  @override
  Widget build(BuildContext context) {
    final n = _n;
    final top = MediaQuery.paddingOf(context).top;
    return AuroraBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: ListView(
          padding: EdgeInsets.fromLTRB(
            14,
            top + 10,
            14,
            30 + MediaQuery.paddingOf(context).bottom,
          ),
          children: [
            _panel(n),
            const SizedBox(height: 18),
            Text(
              'Summani kiriting',
              style: TextStyle(
                color: WebC.white,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
              decoration: BoxDecoration(
                color: WebC.cardBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: WebC.cardBorder),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _amount,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        _ThousandsFormatter(),
                      ],
                      onChanged: (_) => setState(() => _error = null),
                      style: GoogleFonts.spaceGrotesk(
                        color: WebC.white,
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                      ),
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        hintText: '0',
                        hintStyle: GoogleFonts.spaceGrotesk(
                          color: WebC.zinc600,
                          fontSize: 30,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  Text(
                    'söm',
                    style: TextStyle(
                      color: WebC.zinc500,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final q in _quick)
                  GestureDetector(
                    onTap: () => _set(q),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        gradient: n == q ? kBrandGradient : null,
                        color: n == q ? null : WebC.fill5,
                        borderRadius: BorderRadius.circular(99),
                        border: n == q ? null : Border.all(color: WebC.border),
                      ),
                      child: Text(
                        groupDigits(q),
                        style: TextStyle(
                          color: n == q ? Colors.white : WebC.zinc300,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Tölov usuli',
              style: TextStyle(
                color: WebC.white,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _method_(
                    'click',
                    'Click',
                    svg: 'assets/pay/click.svg',
                    ready: true,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _method_(
                    'payme',
                    'Payme',
                    svg: 'assets/pay/payme.svg',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _method_(
                    'uzum',
                    'Uzum Bank',
                    png: 'assets/pay/uzum.png',
                  ),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              Text(_error!, style: TextStyle(color: WebC.red, fontSize: 14)),
            ],
            const SizedBox(height: 20),
            AppDialogButton(
              label: n > 0 ? '${groupDigits(n)} söm tölaş' : 'Tölaş',
              busy: _busy,
              onTap: n > 0 ? _pay : null,
            ),
            const SizedBox(height: 12),
            Center(
              child: GestureDetector(
                onTap: () => LegalScreen.open(context),
                child: Text.rich(
                  TextSpan(
                    children: [
                      const TextSpan(text: 'Tölaş orqali '),
                      TextSpan(
                        text: 'ommaviy oferta',
                        style: TextStyle(
                          color: WebC.indigo,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                      const TextSpan(text: ' şartlariga rozilik bildirasiz.'),
                    ],
                  ),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: WebC.zinc500,
                    fontSize: 12.5,
                    height: 1.4,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _panel(int n) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF4F46E5), Color(0xFF7C3AED), Color(0xFFC026D3)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF7C3AED).withValues(alpha: 0.35),
            blurRadius: 30,
            offset: const Offset(0, 14),
            spreadRadius: -10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.of(context).maybePop(),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(8, 7, 12, 7),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TIcon(
                        TI.arrow_back_ios_new_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Orqaga',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Image.asset('assets/plus-mark.png', height: 22),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            '$_platform · hamyon',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.8),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Hamyonni töldiriş',
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tölanadigan summa',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 12.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${groupDigits(n)} söm',
                        style: GoogleFonts.spaceGrotesk(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: SvgPicture.asset('assets/pay/click.svg', height: 16),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _trust(
            TI.verified_user_rounded,
            'Xavfsiz tölov',
            'Karta maʼlumotlari saqlanmaydi',
          ),
          _trust(
            TI.rocket_launch_outlined,
            'Darhol tuşadi',
            'Balans tölovdan söng bir neça soniyada yangilanadi',
          ),
          _trust(
            TI.account_balance_wallet_outlined,
            'Bitta hamyon',
            'Barça tayyorr xizmatlarida işlaydi',
          ),
        ],
      ),
    );
  }

  Widget _trust(TIData icon, String title, String sub) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(child: TIcon(icon, size: 17, color: Colors.white)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '$title — ',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                TextSpan(text: sub),
              ],
            ),
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.92),
              fontSize: 12.5,
              height: 1.35,
            ),
          ),
        ),
      ],
    ),
  );

  // ignore: non_constant_identifier_names
  Widget _method_(
    String id,
    String name, {
    String? svg,
    String? png,
    bool ready = false,
  }) {
    final on = _method == id && ready;
    return GestureDetector(
      onTap: ready
          ? () => setState(() => _method = id)
          : () => showToast(context, '$name tez orada ulanadi'),
      child: Opacity(
        opacity: ready ? 1 : 0.5,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 74,
          decoration: BoxDecoration(
            color: AppColors.isLight
                ? Colors.white
                : Colors.white.withValues(alpha: 0.96),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: on
                  ? const Color(0xFF6366F1)
                  : Colors.black.withValues(alpha: 0.08),
              width: on ? 2.2 : 1,
            ),
          ),
          child: Stack(
            children: [
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: ColorFiltered(
                    colorFilter: ready
                        ? const ColorFilter.mode(
                            Colors.transparent,
                            BlendMode.dst,
                          )
                        : const ColorFilter.matrix([
                            0.33,
                            0.33,
                            0.33,
                            0,
                            0,
                            0.33,
                            0.33,
                            0.33,
                            0,
                            0,
                            0.33,
                            0.33,
                            0.33,
                            0,
                            0,
                            0,
                            0,
                            0,
                            1,
                            0,
                          ]),
                    child: svg != null
                        ? SvgPicture.asset(svg, height: 20)
                        : Image.asset(png!, height: 22),
                  ),
                ),
              ),
              if (!ready)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF18181B),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: const Text(
                      'Tez orada',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              if (on)
                const Positioned(
                  top: 6,
                  right: 6,
                  child: TIcon(
                    TI.check_circle_rounded,
                    size: 18,
                    color: Color(0xFF6366F1),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "100000" → "100 000" (yozish paytida).
class _ThousandsFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return const TextEditingValue();
    final n = int.parse(digits.length > 9 ? digits.substring(0, 9) : digits);
    final t = groupDigits(n);
    return TextEditingValue(
      text: t,
      selection: TextSelection.collapsed(offset: t.length),
    );
  }
}
