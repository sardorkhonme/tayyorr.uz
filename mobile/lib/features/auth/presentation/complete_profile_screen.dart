import 'dart:typed_data';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants.dart';
import '../../../widgets/app_logo.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/web_ui.dart';
import '../bloc/auth_bloc.dart';
import '../data/auth_repository.dart';

/// Google bilan birinchi marta kirgan (lekin hali rol/login tanlamagan)
/// foydalanuvchi uchun profilni to'ldirish — saytdagi /onboarding.
class CompleteProfileScreen extends StatefulWidget {
  const CompleteProfileScreen({super.key});

  @override
  State<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  final _login = TextEditingController();
  final _password = TextEditingController();
  final _about = TextEditingController();
  String _role = 'ORDERER';
  bool _agree = false;
  bool _showPw = false;
  bool _uploading = false;
  Uint8List? _preview;
  String? _err;

  @override
  void initState() {
    super.initState();
    // Google'dan kelgan ism-familiyani oldindan to'ldiramiz
    final user = context.read<AuthBloc>().state.user;
    final parts = (user?.name ?? '').trim().split(RegExp(r'\s+'));
    _firstName = TextEditingController(text: user?.firstName ?? (parts.isNotEmpty ? parts.first : ''));
    _lastName = TextEditingController(text: user?.lastName ?? (parts.length > 1 ? parts.sublist(1).join(' ') : ''));
  }

  @override
  void dispose() {
    for (final c in [_firstName, _lastName, _login, _password, _about]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800, imageQuality: 85);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final bytes = await file.readAsBytes();
      if (mounted) setState(() => _preview = bytes);
      final ext = file.name.contains('.') ? file.name.split('.').last.toLowerCase() : 'jpg';
      final contentType = switch (ext) {
        'png' => 'image/png',
        'webp' => 'image/webp',
        _ => 'image/jpeg',
      };
      final user = await AuthRepository().uploadAvatar(bytes: bytes, filename: file.name, contentType: contentType);
      if (mounted) context.read<AuthBloc>().add(AuthUserUpdated(user));
    } catch (_) {
      if (mounted) setState(() => _err = "Rasmni yuklab bo'lmadi");
    } finally {
      if (mounted) {
        setState(() {
          _uploading = false;
          _preview = null;
        });
      }
    }
  }

  void _submit() {
    setState(() => _err = null);
    final image = context.read<AuthBloc>().state.user?.image;
    if ((image ?? '').isEmpty) {
      setState(() => _err = 'Glavniy rasmni yuklang');
      return;
    }
    if (!_agree) {
      setState(() => _err = 'Davom etish uchun oferta shartlariga rozilik bering');
      return;
    }
    FocusScope.of(context).unfocus();
    context.read<AuthBloc>().add(
          AuthOnboardingCompleted(
            role: _role,
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            login: _login.text.trim(),
            password: _password.text,
            about: _about.text.trim(),
          ),
        );
  }

  Widget _field(String label, Widget input) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [WebLabel(label), input],
      );

  @override
  Widget build(BuildContext context) {
    final image = context.select((AuthBloc b) => b.state.user?.image);
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
                      padding: const EdgeInsets.all(28),
                      child: BlocBuilder<AuthBloc, AuthState>(
                        // Navigatsiya (muvaffaqiyatli yakunlangandan keyin)
                        // markazlashtirilgan — qara: app.dart'dagi BlocListener.
                        builder: (context, state) {
                          final busy = state.status == AuthStatus.authenticating;
                          final error = _err ?? state.error;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text("Profilni to'ldiring",
                                  style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              Text('Barcha maydonlar majburiy.', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
                              const SizedBox(height: 24),
                              Row(
                                children: [
                                  for (final r in const [('ORDERER', 'Buyurtma beruvchi'), ('PREPARER', 'Tayyorlovchi')]) ...[
                                    if (r.$1 == 'PREPARER') const SizedBox(width: 12),
                                    Expanded(child: _RoleButton(
                                      label: r.$2,
                                      selected: _role == r.$1,
                                      onTap: () => setState(() => _role = r.$1),
                                    )),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 16),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: _field('Ism', WebInput(controller: _firstName))),
                                  const SizedBox(width: 12),
                                  Expanded(child: _field('Familiya', WebInput(controller: _lastName))),
                                ],
                              ),
                              const SizedBox(height: 16),
                              _field('Login', WebInput(controller: _login)),
                              const SizedBox(height: 16),
                              _field(
                                'Parol',
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
                              ),
                              const SizedBox(height: 4),
                              Text('Keyinchalik login + parol bilan ham kira olasiz.',
                                  style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                              const SizedBox(height: 16),
                              _field("Qo'shimcha ma'lumot", WebInput(controller: _about, maxLines: 3, minLines: 3)),
                              const SizedBox(height: 16),
                              const WebLabel('Glavniy rasm'),
                              Row(
                                children: [
                                  Container(
                                    width: 80,
                                    height: 80,
                                    clipBehavior: Clip.antiAlias,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: WebC.fill5,
                                      border: Border.all(color: WebC.border),
                                    ),
                                    child: _preview != null
                                        ? Image.memory(_preview!, width: 80, height: 80, fit: BoxFit.cover)
                                        : (image ?? '').isNotEmpty
                                        ? Image.network(image!, width: 80, height: 80, fit: BoxFit.cover)
                                        : Text("rasm yo'q", style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                                  ),
                                  const SizedBox(width: 16),
                                  WebButton(
                                    label: _uploading ? 'Yuklanmoqda...' : 'Rasm tanlash',
                                    variant: WebBtn.ghost,
                                    onPressed: _uploading ? null : _pickAvatar,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Container(height: 1, color: WebC.border),
                              const SizedBox(height: 16),
                              GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () => setState(() => _agree = !_agree),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: Checkbox(
                                          value: _agree,
                                          onChanged: (v) => setState(() => _agree = v ?? false),
                                          activeColor: const Color(0xFF6366F1),
                                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text.rich(
                                        TextSpan(children: [
                                          const TextSpan(text: 'Men '),
                                          TextSpan(
                                            text: 'ommaviy oferta va foydalanish shartlari',
                                            style: TextStyle(
                                              color: WebC.indigo,
                                              decoration: TextDecoration.underline,
                                              decorationColor: WebC.indigo,
                                            ),
                                            recognizer: TapGestureRecognizer()
                                              ..onTap = () => launchUrl(Uri.parse('$kSiteUrl/terms'),
                                                  mode: LaunchMode.externalApplication),
                                          ),
                                          const TextSpan(
                                              text: " bilan tanishdim, ularga roziman va ma'lumotlarni o'z ixtiyorim bilan beraman."),
                                        ]),
                                        style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (error != null) ...[
                                const SizedBox(height: 16),
                                Text(error, style: TextStyle(color: WebC.red, fontSize: 14)),
                              ],
                              const SizedBox(height: 16),
                              WebButton(
                                label: busy ? '...' : 'Saqlash va davom etish',
                                expand: true,
                                onPressed: busy || !_agree ? null : _submit,
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    Center(
                      child: GestureDetector(
                        onTap: () => context.read<AuthBloc>().add(const AuthLoggedOut()),
                        child: Text('Boshqa hisob bilan kirish', style: TextStyle(color: WebC.zinc500, fontSize: 14)),
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

class _RoleButton extends StatelessWidget {
  const _RoleButton({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF6366F1).withValues(alpha: 0.10) : WebC.fill5.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? const Color(0xFF818CF8).withValues(alpha: 0.7) : WebC.border),
        ),
        child: Text(
          label,
          style: TextStyle(color: selected ? WebC.white : WebC.zinc300, fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
    );
  }
}
