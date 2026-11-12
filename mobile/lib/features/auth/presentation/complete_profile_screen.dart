import 'package:tayyorr_app/core/ui/ticons.dart';
import '../../legal/legal_screen.dart';
import 'dart:typed_data';

import 'package:flutter/cupertino.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/liquid_glass.dart';
import '../../../widgets/app_logo.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/google_logo.dart';
import '../../../widgets/web_ui.dart';
import '../bloc/auth_bloc.dart';
import '../data/auth_repository.dart';

/// Google bilan birinchi marta kirgan (lekin hali rol/login tanlamagan)
/// foydalanuvchi uchun profilni to'ldirish — saytdagi /onboarding kabi 2 bosqichli:
/// 1-qadam: Bizni qayerdan eshitdingiz?
/// 2-qadam: Profil ma'lumotlarini to'ldirish
class CompleteProfileScreen extends StatefulWidget {
  const CompleteProfileScreen({super.key});

  @override
  State<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  int _step = 1;
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  final _login = TextEditingController();
  final _password = TextEditingController();
  final _about = TextEditingController();
  final _hearAboutUsDetail = TextEditingController();
  String _role = 'ORDERER';
  DateTime? _birth;
  String? _hearAboutUs;
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
    for (final c in [_firstName, _lastName, _login, _password, _about, _hearAboutUsDetail]) {
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
      if (mounted) setState(() => _err = "Rasmni yuklab bölmadi");
    } finally {
      if (mounted) {
        setState(() {
          _uploading = false;
          _preview = null;
        });
      }
    }
  }

  void _continueStep1() {
    setState(() => _err = null);
    if (_hearAboutUs == null || _hearAboutUs!.isEmpty) {
      setState(() => _err = 'Iltimos, variantlardan birini tanlang');
      return;
    }
    if (_hearAboutUs == 'other' && _hearAboutUsDetail.text.trim().isEmpty) {
      setState(() => _err = 'Qayerdan eşitganingizni yozing');
      return;
    }
    setState(() => _step = 2);
  }

  void _submit() {
    setState(() => _err = null);
    if (_hearAboutUs == null || _hearAboutUs!.isEmpty) {
      setState(() {
        _err = 'Bizni qayerdan eşitganingizni tanlang';
        _step = 1;
      });
      return;
    }
    if (_hearAboutUs == 'other' && _hearAboutUsDetail.text.trim().isEmpty) {
      setState(() {
        _err = 'Qayerdan eşitganingizni yozing';
        _step = 1;
      });
      return;
    }
    if (_firstName.text.trim().length < 2) {
      setState(() => _err = 'Ismingizni kiriting');
      return;
    }
    if (_lastName.text.trim().length < 2) {
      setState(() => _err = 'Familiyangizni kiriting');
      return;
    }
    if (_birth == null) {
      setState(() => _err = "Tuğilgan sanangizni tanlang");
      return;
    }
    if (_login.text.trim().length < 3) {
      setState(() => _err = "Login kamida 3 ta belgidan iborat bölişi kerak");
      return;
    }
    if (_password.text.length < 6) {
      setState(() => _err = "Parol kamida 6 ta belgidan iborat bölişi kerak");
      return;
    }
    if (_about.text.trim().length < 5) {
      setState(() => _err = "Qöşimça maʼlumot kamida 5 ta belgidan iborat bölişi kerak");
      return;
    }
    final image = context.read<AuthBloc>().state.user?.image;
    if ((image ?? '').isEmpty) {
      setState(() => _err = 'Glavniy rasmni yuklang');
      return;
    }
    if (!_agree) {
      setState(() => _err = 'Davom etiş uçun oferta şartlariga rozilik bering');
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
        birthDate:
            '${_birth!.year}-${_birth!.month.toString().padLeft(2, '0')}-${_birth!.day.toString().padLeft(2, '0')}',
        hearAboutUs: _hearAboutUs,
        hearAboutUsDetail:
            _hearAboutUs == 'other' ? _hearAboutUsDetail.text.trim() : null,
      ),
    );
  }

  Widget _field(String label, Widget input) =>
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [WebLabel(label), input]);

  Widget _buildStepIndicator() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          _step == 1 ? '1-qadam / 2' : '2-qadam / 2',
          style: TextStyle(
            color: WebC.indigoSoft,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 28,
              height: 6,
              decoration: BoxDecoration(
                color: _step == 1 ? const Color(0xFF6366F1) : const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(width: 6),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 28,
              height: 6,
              decoration: BoxDecoration(
                color: _step == 2 ? const Color(0xFF6366F1) : WebC.fill10,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSourceCard(_SourceOptionItem opt) {
    final isSelected = _hearAboutUs == opt.id;
    return GestureDetector(
      onTap: () => setState(() {
        _hearAboutUs = opt.id;
        _err = null;
      }),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF6366F1).withValues(alpha: 0.12)
              : WebC.fill5.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF818CF8).withValues(alpha: 0.85)
                : WebC.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            opt.icon,
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                opt.label,
                style: TextStyle(
                  color: isSelected ? WebC.white : WebC.zinc300,
                  fontSize: 13.5,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleOnly({required bool busy, String? error}) {
    final name = context.read<AuthBloc>().state.user?.firstName;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          name != null && name.isNotEmpty ? 'Xuş kelibsiz, $name!' : 'Xuş kelibsiz!',
          style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        Text(
          'Hisobingiz tayyor. tayyorr.uz da qanday foydalanasiz? Rolni bir marta tanlaysiz.',
          style: TextStyle(color: WebC.zinc400, fontSize: 14),
        ),
        const SizedBox(height: 20),
        _RoleButton(
          label: 'Buyurtma beruvçi — iş buyuraman',
          selected: _role == 'ORDERER',
          onTap: () => setState(() => _role = 'ORDERER'),
        ),
        const SizedBox(height: 10),
        _RoleButton(
          label: 'Tayyorlovçi — iş tayyorlab beraman',
          selected: _role == 'PREPARER',
          onTap: () => setState(() => _role = 'PREPARER'),
        ),
        if (error != null) ...[
          const SizedBox(height: 14),
          Text(error, style: const TextStyle(color: Color(0xFFF87171), fontSize: 13)),
        ],
        const SizedBox(height: 20),
        WebButton(
          label: 'Davom etiş →',
          expand: true,
          busy: busy,
          onPressed: busy ? null : () => context.read<AuthBloc>().add(AuthRoleChosen(_role)),
        ),
      ],
    );
  }

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
                        builder: (context, state) {
                          final busy = state.status == AuthStatus.authenticating;
                          final error = _err ?? state.error;

                          // tayyorr+ da ro'yxatdan o'tgan (login bor, rol yo'q) — faqat rol, saytdagidek
                          final u = state.user;
                          if (u != null && u.login != null && u.role == null) {
                            return _buildRoleOnly(busy: busy, error: error);
                          }

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildStepIndicator(),
                              const SizedBox(height: 18),

                              // ================= 1-QADAM =================
                              if (_step == 1) ...[
                                Text(
                                  'Bizni qayerdan eşitdingiz?',
                                  style: TextStyle(
                                    color: WebC.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  "Tayyorr.uz haqida maʼlumotni qayerdan oldingiz? Mos variantni tanlang.",
                                  style: TextStyle(
                                    color: WebC.zinc400,
                                    fontSize: 13.5,
                                    height: 1.4,
                                  ),
                                ),
                                const SizedBox(height: 22),
                                for (int i = 0; i < _sourceOptions.length; i += 2) ...[
                                  if (i > 0) const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(child: _buildSourceCard(_sourceOptions[i])),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: i + 1 < _sourceOptions.length
                                            ? _buildSourceCard(_sourceOptions[i + 1])
                                            : const SizedBox.shrink(),
                                      ),
                                    ],
                                  ),
                                ],
                                if (_hearAboutUs == 'other') ...[
                                  const SizedBox(height: 14),
                                  WebInput(
                                    controller: _hearAboutUsDetail,
                                    hint: "Qayerdan eşitganingizni yozing (YouTube, TikTok...)",
                                  ),
                                ],
                                if (error != null) ...[
                                  const SizedBox(height: 16),
                                  Text(error, style: TextStyle(color: WebC.red, fontSize: 13.5)),
                                ],
                                const SizedBox(height: 22),
                                WebButton(
                                  label: 'Davom etiş →',
                                  expand: true,
                                  onPressed: _continueStep1,
                                ),
                              ],

                              // ================= 2-QADAM =================
                              if (_step == 2) ...[
                                Text(
                                  "Profilni töldiring",
                                  style: TextStyle(
                                    color: WebC.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Barça maydonlar majburiy.',
                                  style: TextStyle(color: WebC.zinc400, fontSize: 13.5),
                                ),
                                const SizedBox(height: 24),
                                Row(
                                  children: [
                                    for (final r in const [
                                      ('ORDERER', 'Buyurtma beruvçi'),
                                      ('PREPARER', 'Tayyorlovçi'),
                                    ]) ...[
                                      if (r.$1 == 'PREPARER') const SizedBox(width: 12),
                                      Expanded(
                                        child: _RoleButton(
                                          label: r.$2,
                                          selected: _role == r.$1,
                                          onTap: () => setState(() => _role = r.$1),
                                        ),
                                      ),
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
                                const WebLabel("Tuğilgan sana"),
                                BirthDateField(value: _birth, onChanged: (d) => setState(() => _birth = d)),
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
                                      child: TIcon(
                                        _showPw ? TI.visibility_off_outlined : TI.visibility_outlined,
                                        size: 18,
                                        color: WebC.zinc500,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Keyinçalik login + parol bilan ham kira olasiz.',
                                  style: TextStyle(color: WebC.zinc500, fontSize: 12),
                                ),
                                const SizedBox(height: 16),
                                _field("Qöşimça maʼlumot", WebInput(controller: _about, maxLines: 3, minLines: 3)),
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
                                        ),
                                      foregroundDecoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: WebC.border)),
                                      child: _preview != null
                                          ? Image.memory(_preview!, width: 80, height: 80, fit: BoxFit.cover)
                                          : (image ?? '').isNotEmpty
                                          ? Image.network(image!, width: 80, height: 80, fit: BoxFit.cover)
                                          : Text("rasm yöq", style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                                    ),
                                    const SizedBox(width: 16),
                                    WebButton(
                                      label: _uploading ? 'Yuklanmoqda...' : 'Rasm tanlaş',
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
                                          TextSpan(
                                            children: [
                                              const TextSpan(text: 'Men '),
                                              TextSpan(
                                                text: 'ommaviy oferta va foydalaniş şartlari',
                                                style: TextStyle(
                                                  color: WebC.indigo,
                                                  decoration: TextDecoration.underline,
                                                  decorationColor: WebC.indigo,
                                                ),
                                                recognizer: TapGestureRecognizer()
                                                  ..onTap = () => LegalScreen.open(context),
                                              ),
                                              const TextSpan(
                                                text:
                                                    " bilan tanişdim, ularga roziman va maʼlumotlarni öz ixtiyorim bilan beraman.",
                                              ),
                                            ],
                                          ),
                                          style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (error != null) ...[
                                  const SizedBox(height: 16),
                                  Text(error, style: TextStyle(color: WebC.red, fontSize: 13.5)),
                                ],
                                const SizedBox(height: 20),
                                Row(
                                  children: [
                                    WebButton(
                                      label: '← Orqaga',
                                      variant: WebBtn.ghost,
                                      onPressed: busy
                                          ? null
                                          : () => setState(() {
                                                _err = null;
                                                _step = 1;
                                              }),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: WebButton(
                                        label: busy ? 'Saqlanmoqda...' : 'Saqlaş va davom etiş',
                                        expand: true,
                                        onPressed: busy || !_agree ? null : _submit,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    Center(
                      child: GestureDetector(
                        onTap: () => context.read<AuthBloc>().add(const AuthLoggedOut()),
                        child: Text.rich(
                          TextSpan(
                            text: 'Hisobingiz bormi? ',
                            style: TextStyle(color: WebC.zinc500, fontSize: 14),
                            children: [
                              TextSpan(
                                text: 'Kiriş',
                                style: TextStyle(
                                  color: WebC.indigo,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
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

class _SourceOptionItem {
  final String id;
  final String label;
  final Widget icon;

  const _SourceOptionItem({
    required this.id,
    required this.label,
    required this.icon,
  });
}

final _sourceOptions = [
  _SourceOptionItem(
    id: 'instagram',
    label: 'Instagram',
    icon: Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        gradient: const LinearGradient(
          colors: [Color(0xFF833AB4), Color(0xFFFD1D1D), Color(0xFFFCB045)],
          begin: Alignment.bottomLeft,
          end: Alignment.topRight,
        ),
      ),
      child: const Center(
        child: TIcon(TI.camera_alt, color: Colors.white, size: 15),
      ),
    ),
  ),
  _SourceOptionItem(
    id: 'telegram',
    label: 'Telegram',
    icon: SvgPicture.string(
      '''<svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#2AABEE" />
        <path d="M5.2 11.8l12.4-4.8c.6-.2 1.1.2.9.8l-2.1 9.9c-.2.7-.6.8-1.2.5l-3.4-2.5-1.6 1.6c-.2.2-.4.3-.8.3l.2-3.5 6.4-5.8c.3-.3 0-.4-.4-.2l-7.9 5-3.4-1.1c-.7-.2-.7-.7.1-.9z" fill="#fff"/>
      </svg>''',
      width: 28,
      height: 28,
    ),
  ),
  _SourceOptionItem(
    id: 'ai',
    label: "Sunʼiy intellekt",
    icon: Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        gradient: const LinearGradient(
          colors: [Color(0xFF8B5CF6), Color(0xFFEC4899), Color(0xFFF59E0B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: TIcon(TI.auto_awesome, color: Colors.white, size: 15),
      ),
    ),
  ),
  _SourceOptionItem(
    id: 'google',
    label: 'Google',
    icon: Container(
      width: 28,
      height: 28,
      padding: const EdgeInsets.all(4.5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const GoogleLogo(size: 15),
    ),
  ),
  _SourceOptionItem(
    id: 'friend',
    label: "Döstimdan",
    icon: Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: const Color(0xFF0D9488),
      ),
      child: const Center(
        child: TIcon(TI.people_alt_rounded, color: Colors.white, size: 15),
      ),
    ),
  ),
  _SourceOptionItem(
    id: 'other',
    label: 'Boşqa',
    icon: Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: const Color(0xFF6366F1),
      ),
      child: const Center(
        child: TIcon(TI.chat_bubble_outline_rounded, color: Colors.white, size: 15),
      ),
    ),
  ),
];

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

const _monthNames = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

/// "15-mart 2004"
String formatBirthDate(DateTime d) => '${d.day}-${_monthNames[d.month - 1]} ${d.year}';

/// Pastdan chiqadigan aylanma tanlagich: Kun / Oy / Yil (10–100 yosh).
Future<DateTime?> showBirthDatePicker(BuildContext context, {DateTime? initial}) {
  final now = DateTime.now();
  final maxYear = now.year - 10;
  final minYear = now.year - 100;
  final start = initial ?? DateTime(now.year - 18, 1, 1);
  var year = start.year.clamp(minYear, maxYear);
  var month = start.month;
  var day = start.day;
  final dayCtl = FixedExtentScrollController(initialItem: day - 1);
  final monthCtl = FixedExtentScrollController(initialItem: month - 1);
  final yearCtl = FixedExtentScrollController(initialItem: maxYear - year);

  int daysIn(int y, int m) => DateTime(y, m + 1, 0).day;

  return showModalBottomSheet<DateTime>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) => StatefulBuilder(
      builder: (ctx, setSheet) {
        final maxDay = daysIn(year, month);
        if (day > maxDay) day = maxDay;
        final text = TextStyle(color: WebC.white, fontSize: 18);
        Widget wheel({
          required FixedExtentScrollController c,
          required int count,
          required String Function(int) label,
          required ValueChanged<int> onChanged,
          int flex = 1,
        }) => Expanded(
          flex: flex,
          child: CupertinoPicker(
            scrollController: c,
            itemExtent: 40,
            selectionOverlay: const CupertinoPickerDefaultSelectionOverlay(background: Color(0x1A818CF8)),
            onSelectedItemChanged: onChanged,
            children: [for (var i = 0; i < count; i++) Center(child: Text(label(i), style: text))],
          ),
        );
        return GlassSheetPanel(
          padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(ctx).padding.bottom + 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(color: WebC.fill10, borderRadius: BorderRadius.circular(99)),
              ),
              const SizedBox(height: 14),
              Text(
                "Tuğilgan sanangiz",
                style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(formatBirthDate(DateTime(year, month, day)), style: TextStyle(color: WebC.indigoSoft, fontSize: 14)),
              const SizedBox(height: 8),
              SizedBox(
                height: 200,
                child: Row(
                  children: [
                    wheel(
                      c: dayCtl,
                      count: maxDay,
                      label: (i) => '${i + 1}',
                      onChanged: (i) => setSheet(() => day = i + 1),
                    ),
                    wheel(
                      c: monthCtl,
                      count: 12,
                      flex: 2,
                      label: (i) => _monthNames[i][0].toUpperCase() + _monthNames[i].substring(1),
                      onChanged: (i) => setSheet(() => month = i + 1),
                    ),
                    wheel(
                      c: yearCtl,
                      count: maxYear - minYear + 1,
                      label: (i) => '${maxYear - i}',
                      onChanged: (i) => setSheet(() => year = maxYear - i),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: WebButton(
                  label: 'Tanlaş',
                  expand: true,
                  onPressed: () => Navigator.of(sheetCtx).pop(DateTime(year, month, day)),
                ),
              ),
            ],
          ),
        );
      },
    ),
  );
}

/// Bosilganda aylanma tanlagich ochiladigan "Tug'ilgan sana" maydoni.
class BirthDateField extends StatelessWidget {
  const BirthDateField({super.key, required this.value, required this.onChanged});
  final DateTime? value;
  final ValueChanged<DateTime> onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        FocusScope.of(context).unfocus();
        final picked = await showBirthDatePicker(context, initial: value);
        if (picked != null) onChanged(picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12.8, vertical: 11),
        decoration: BoxDecoration(
          color: AppColors.isLight ? Colors.white : Colors.white.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(11.2),
          border: Border.all(
            color: AppColors.isLight ? Colors.black.withValues(alpha: 0.14) : Colors.white.withValues(alpha: 0.10),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                value == null ? 'Kun / Oy / Yil' : formatBirthDate(value!),
                style: TextStyle(color: value == null ? WebC.zinc500 : WebC.white, fontSize: 14),
              ),
            ),
            TIcon(TI.cake_outlined, size: 18, color: WebC.zinc500),
          ],
        ),
      ),
    );
  }
}
