import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../legal/legal_screen.dart';
import '../../../core/network/api_exception.dart';
import '../../../widgets/app_logo.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/google_logo.dart';
import '../../../widgets/web_ui.dart';
import '../bloc/auth_bloc.dart';
import '../data/auth_repository.dart';

/// Ro'yxatdan o'tish — saytdagidek: 1) email → "Kod yuborish" (pastida Google), 2) 4 xonali kod.
/// Keyin avvalgidek profil to'ldiriladi (CompleteProfileScreen).
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _repo = AuthRepository();
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  bool _codeStep = false;
  bool _busy = false;
  bool _exists = false;
  String? _error;
  int _wait = 0;
  Timer? _timer;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _codeFocus.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _countdown(int sec) {
    _timer?.cancel();
    setState(() => _wait = sec);
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
      _exists = false;
    });
    try {
      final wait = await _repo.sendEmailCode(email);
      if (!mounted) return;
      setState(() {
        _codeStep = true;
        _busy = false;
        _code.clear();
      });
      _countdown(wait);
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _codeFocus.requestFocus(),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = friendlyError(e);
        _exists = e is ApiException && e.statusCode == 409;
      });
    }
  }

  Future<void> _verify() async {
    final code = _code.text.replaceAll(RegExp(r'\D'), '');
    if (code.length != 4) {
      setState(() => _error = '4 xonali kodni kiriting');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final user = await _repo.verifyEmailCode(_email.text.trim(), code);
      if (!mounted) return;
      context.read<AuthBloc>().add(AuthSignedIn(user));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = friendlyError(e);
      });
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: AppLogo(height: 30)),
                    const SizedBox(height: 32),
                    WebCard(
                      padding: const EdgeInsets.all(24),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 260),
                        child: _codeStep ? _codeView() : _emailView(),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Center(
                      child: GestureDetector(
                        onTap: () => Navigator.of(context).maybePop(),
                        child: Text.rich(
                          TextSpan(
                            children: [
                              const TextSpan(text: 'Akkountingiz bormi? '),
                              TextSpan(
                                text: 'Kiriş',
                                style: TextStyle(color: WebC.indigo),
                              ),
                            ],
                          ),
                          style: TextStyle(color: WebC.zinc400, fontSize: 14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    // saytdagidek — eng pastda rozilik matni (hujjatlar ilova ichida ochiladi)
                    Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(text: "Röyxatdan ötiş orqali "),
                          TextSpan(
                            text: 'ommaviy oferta va foydalaniş şartlari',
                            style: TextStyle(
                              color: WebC.indigo,
                              decoration: TextDecoration.underline,
                            ),
                            recognizer: TapGestureRecognizer()
                              ..onTap = () => LegalScreen.open(context),
                          ),
                          const TextSpan(text: ' hamda '),
                          TextSpan(
                            text: 'maxfiylik siyosati',
                            style: TextStyle(
                              color: WebC.indigo,
                              decoration: TextDecoration.underline,
                            ),
                            recognizer: TapGestureRecognizer()
                              ..onTap = () =>
                                  LegalScreen.open(context, privacy: true),
                          ),
                          const TextSpan(text: 'ga rozilik bildirasiz.'),
                        ],
                      ),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: WebC.zinc500,
                        fontSize: 12.5,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _emailView() {
    return Column(
      key: const ValueKey('email'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Hisob yarating',
          style: TextStyle(
            color: WebC.white,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Emailingizni kiriting — unga 4 xonali kod yuboramiz.',
          style: TextStyle(color: WebC.zinc400, fontSize: 14, height: 1.4),
        ),
        const SizedBox(height: 20),
        const WebLabel('Email'),
        WebInput(
          controller: _email,
          hint: 'siz@gmail.com',
          keyboardType: TextInputType.emailAddress,
          onSubmitted: (_) => _send(),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: TextStyle(color: WebC.red, fontSize: 14)),
          if (_exists) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: Text(
                'Kiriş sahifasiga ötiş ›',
                style: TextStyle(color: WebC.indigo, fontSize: 14),
              ),
            ),
          ],
        ],
        const SizedBox(height: 16),
        WebButton(
          label: 'Kod yuboriş',
          busy: _busy,
          expand: true,
          onPressed: _busy ? null : _send,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Container(height: 1, color: WebC.border)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'yoki',
                style: TextStyle(color: WebC.zinc600, fontSize: 12),
              ),
            ),
            Expanded(child: Container(height: 1, color: WebC.border)),
          ],
        ),
        const SizedBox(height: 16),
        WebButton(
          label: "Google bilan röyxatdan ötiş",
          variant: WebBtn.white,
          expand: true,
          icon: const GoogleLogo(size: 16),
          onPressed: _busy
              ? null
              : () {
                  Navigator.of(context).maybePop();
                  context.read<AuthBloc>().add(
                    const AuthGoogleSignInRequested(),
                  );
                },
        ),
      ],
    );
  }

  Widget _codeView() {
    final digits = _code.text;
    return Column(
      key: const ValueKey('code'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Emailingizni tekşiring',
          style: TextStyle(
            color: WebC.white,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: _email.text.trim(),
                style: TextStyle(
                  color: WebC.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const TextSpan(text: ' manziliga 4 xonali kod yuborildi.'),
            ],
          ),
          style: TextStyle(color: WebC.zinc400, fontSize: 14, height: 1.4),
        ),
        const SizedBox(height: 22),
        // 4 ta katak — ostida ko'rinmas maydon (paste ham ishlaydi)
        GestureDetector(
          onTap: () => _codeFocus.requestFocus(),
          child: Stack(
            children: [
              Opacity(
                opacity: 0,
                child: SizedBox(
                  height: 64,
                  child: TextField(
                    controller: _code,
                    focusNode: _codeFocus,
                    keyboardType: TextInputType.number,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(4),
                    ],
                    onChanged: (v) {
                      setState(() => _error = null);
                      if (v.length == 4) _verify();
                    },
                  ),
                ),
              ),
              IgnorePointer(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < 4; i++) ...[
                      if (i > 0) const SizedBox(width: 12),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        width: 56,
                        height: 64,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          color: WebC.fill5,
                          border: Border.all(
                            width: 1.5,
                            color:
                                i < digits.length ||
                                    (i == digits.length && _codeFocus.hasFocus)
                                ? const Color(0xFF818CF8)
                                : WebC.border,
                          ),
                        ),
                        child: Text(
                          i < digits.length ? digits[i] : '',
                          style: TextStyle(
                            color: WebC.white,
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: TextStyle(color: WebC.red, fontSize: 14),
          ),
        ],
        const SizedBox(height: 20),
        WebButton(
          label: 'Tasdiqlaş',
          busy: _busy,
          expand: true,
          onPressed: _busy ? null : _verify,
        ),
        const SizedBox(height: 14),
        Center(
          child: _wait > 0
              ? Text(
                  'Kodni qayta yuboriş: 0:${_wait.toString().padLeft(2, '0')}',
                  style: TextStyle(color: WebC.zinc500, fontSize: 13.5),
                )
              : GestureDetector(
                  onTap: _busy ? null : _send,
                  child: Text(
                    'Kodni qayta yuboriş',
                    style: TextStyle(color: WebC.indigo, fontSize: 13.5),
                  ),
                ),
        ),
        const SizedBox(height: 8),
        Center(
          child: GestureDetector(
            onTap: () => setState(() {
              _codeStep = false;
              _error = null;
            }),
            child: Text(
              "Emailni özgartiriş",
              style: TextStyle(color: WebC.zinc500, fontSize: 13),
            ),
          ),
        ),
      ],
    );
  }
}
