import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../widgets/app_logo.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/google_logo.dart';
import '../../../widgets/web_ui.dart';
import '../bloc/auth_bloc.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _login = TextEditingController();
  final _password = TextEditingController();
  bool _showPw = false;

  @override
  void dispose() {
    _login.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    FocusScope.of(context).unfocus();
    context.read<AuthBloc>().add(
          AuthLoginRequested(
            login: _login.text.trim(),
            password: _password.text,
          ),
        );
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
                      child: BlocBuilder<AuthBloc, AuthState>(
                        // Navigatsiya (muvaffaqiyatli kirishdan keyin)
                        // markazlashtirilgan — qara: app.dart'dagi
                        // BlocListener. Bu yerda faqat xatoni ko'rsatamiz.
                        builder: (context, state) {
                          final busy = state.status == AuthStatus.authenticating;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text('Kiriş',
                                  style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 20),
                              const WebLabel('Login yoki email'),
                              AutofillGroup(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    WebInput(controller: _login),
                                    const SizedBox(height: 16),
                                    const WebLabel('Parol'),
                                    WebInput(
                                      controller: _password,
                                      obscure: !_showPw,
                                      suffix: GestureDetector(
                                        onTap: () => setState(() => _showPw = !_showPw),
                                        child: Icon(
                                          _showPw ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                          size: 18,
                                          color: WebC.zinc500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              // saytdagidek — parol maydoni ostida; tiklash tayyorr+ da (email → havola → yangi parol)
                              Align(
                                alignment: Alignment.centerRight,
                                child: GestureDetector(
                                  onTap: () async {
                                    final email = await Navigator.of(context).push<String>(
                                      MaterialPageRoute(builder: (_) => ForgotPasswordScreen(initialEmail: _login.text.trim())),
                                    );
                                    if (email != null && mounted) setState(() => _login.text = email);
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Text('Parolni unutdingizmi?', style: TextStyle(color: WebC.indigo, fontSize: 13)),
                                  ),
                                ),
                              ),
                              if (state.error != null) ...[
                                const SizedBox(height: 16),
                                Text(state.error!, style: TextStyle(color: WebC.red, fontSize: 14)),
                              ],
                              const SizedBox(height: 16),
                              WebButton(
                                label: busy ? '...' : 'Kiriş',
                                expand: true,
                                onPressed: busy ? null : _submit,
                              ),
                              // Google orqali kirish — doim pastda (sayt bilan bir xil)
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(child: Container(height: 1, color: WebC.border)),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                    child: Text('yoki', style: TextStyle(color: WebC.zinc600, fontSize: 12)),
                                  ),
                                  Expanded(child: Container(height: 1, color: WebC.border)),
                                ],
                              ),
                              const SizedBox(height: 16),
                              WebButton(
                                label: 'Google orqali kiriş',
                                variant: WebBtn.white,
                                expand: true,
                                icon: const GoogleLogo(size: 16),
                                onPressed: busy
                                    ? null
                                    : () => context.read<AuthBloc>().add(const AuthGoogleSignInRequested()),
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Saytdagi kabi — ro'yxatdan o'tish: email + 4 xonali kod (yoki Google);
                    // rol va qolgan ma'lumotlar keyingi qadamda so'raladi.
                    Center(
                      child: GestureDetector(
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                        child: Text.rich(
                          TextSpan(children: [
                            const TextSpan(text: "Akkountingiz yöqmi? "),
                            TextSpan(text: "Röyxatdan ötiş", style: TextStyle(color: WebC.indigo)),
                          ]),
                          style: TextStyle(color: WebC.zinc400, fontSize: 14),
                        ),
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
}

