import 'package:tayyorr_app/core/ui/ticons.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/ui/app_dialogs.dart';
import '../../../widgets/app_logo.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/web_ui.dart';
import '../data/auth_repository.dart';

/// Parolni tiklash — ilova ichida: 1) email, 2) 4 xonali kod + yangi parol (2 marta) → kirish sahifasi.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail = ''});
  final String initialEmail;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _repo = AuthRepository();
  late final _email = TextEditingController(text: widget.initialEmail.contains('@') ? widget.initialEmail : '');
  final _code = TextEditingController();
  final _pw = TextEditingController();
  final _pw2 = TextEditingController();
  bool _step2 = false;
  bool _busy = false;
  bool _show = false;
  String? _error;
  int _wait = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in [_email, _code, _pw, _pw2]) {
      c.dispose();
    }
    super.dispose();
  }

  void _countdown(int s) {
    _timer?.cancel();
    setState(() => _wait = s);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _wait = _wait > 0 ? _wait - 1 : 0);
      if (_wait == 0) t.cancel();
    });
  }

  Future<void> _send() async {
    final email = _email.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$').hasMatch(email)) {
      setState(() => _error = "Email manzilini töğri kiriting");
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final w = await _repo.sendResetCode(email);
      if (!mounted) return;
      setState(() {
        _busy = false;
        _step2 = true;
      });
      _countdown(w);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e.message;
        });
      }
    }
  }

  Future<void> _reset() async {
    final code = _code.text.replaceAll(RegExp(r'\D'), '');
    if (code.length != 4) return setState(() => _error = '4 xonali kodni kiriting');
    if (_pw.text.length < 6) return setState(() => _error = 'Parol kamida 6 ta belgidan iborat bölsin');
    if (_pw.text != _pw2.text) return setState(() => _error = 'Parollar bir xil emas');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _repo.resetPassword(_email.text.trim(), code, _pw.text);
      if (!mounted) return;
      showToast(context, 'Parol yangilandi. Endi yangi parol bilan kiring', kind: ToastKind.success);
      Navigator.of(context).pop(_email.text.trim());
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  const Center(child: AppLogo(height: 30)),
                  const SizedBox(height: 32),
                  WebCard(
                    padding: const EdgeInsets.all(24),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 260),
                      child: _step2 ? _codeView() : _emailView(),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Center(
                    child: GestureDetector(
                      onTap: () => Navigator.of(context).maybePop(),
                      child: Text('‹ Kirişga qaytiş', style: TextStyle(color: WebC.indigo, fontSize: 14)),
                    ),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _emailView() => Column(
        key: const ValueKey('e'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Center(child: AppDialogIcon(TI.lock_reset_rounded)),
          const SizedBox(height: 14),
          Text('Parolni unutdingizmi?', textAlign: TextAlign.center, style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text('Hisobingiz emailini kiriting — unga 4 xonali kod yuboramiz.',
              textAlign: TextAlign.center, style: TextStyle(color: WebC.zinc400, fontSize: 14, height: 1.4)),
          const SizedBox(height: 20),
          const WebLabel('Email'),
          WebInput(controller: _email, hint: 'siz@gmail.com', keyboardType: TextInputType.emailAddress, onSubmitted: (_) => _send()),
          if (_error != null) ...[const SizedBox(height: 12), Text(_error!, style: TextStyle(color: WebC.red, fontSize: 14))],
          const SizedBox(height: 16),
          WebButton(label: _busy ? '...' : 'Kod yuboriş', expand: true, onPressed: _busy ? null : _send),
        ],
      );

  Widget _codeView() => Column(
        key: const ValueKey('c'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Yangi parol', style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(children: [
              TextSpan(text: _email.text.trim(), style: TextStyle(color: WebC.white, fontWeight: FontWeight.w600)),
              const TextSpan(text: ' manziliga kod yuborildi. Xat kelmasa — «Spam» papkasini tekşiring.'),
            ]),
            style: TextStyle(color: WebC.zinc400, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 18),
          const WebLabel('4 xonali kod'),
          TextField(
            controller: _code,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            autofillHints: const [AutofillHints.oneTimeCode],
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4)],
            style: TextStyle(color: WebC.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 14),
            decoration: InputDecoration(
              hintText: '• • • •',
              filled: true,
              fillColor: WebC.fill5,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: WebC.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: WebC.border)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF818CF8), width: 1.5)),
            ),
          ),
          const SizedBox(height: 14),
          const WebLabel('Yangi parol'),
          WebInput(
            controller: _pw,
            obscure: !_show,
            suffix: GestureDetector(
              onTap: () => setState(() => _show = !_show),
              child: TIcon(_show ? TI.visibility_off_outlined : TI.visibility_outlined, size: 18, color: WebC.zinc500),
            ),
          ),
          const SizedBox(height: 12),
          const WebLabel('Yangi parolni takrorlang'),
          WebInput(controller: _pw2, obscure: !_show),
          if (_error != null) ...[const SizedBox(height: 12), Text(_error!, style: TextStyle(color: WebC.red, fontSize: 14))],
          const SizedBox(height: 16),
          WebButton(label: _busy ? '...' : 'Saqlaş', expand: true, onPressed: _busy ? null : _reset),
          const SizedBox(height: 12),
          Center(
            child: _wait > 0
                ? Text('Kodni qayta yuboriş: 0:${_wait.toString().padLeft(2, '0')}', style: TextStyle(color: WebC.zinc500, fontSize: 13))
                : GestureDetector(onTap: _busy ? null : _send, child: Text('Kodni qayta yuboriş', style: TextStyle(color: WebC.indigo, fontSize: 13))),
          ),
        ],
      );
}
