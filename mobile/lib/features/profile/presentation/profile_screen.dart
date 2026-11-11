import 'package:tayyorr_app/core/ui/ticons.dart';
import '../../../core/app_info.dart';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/navigation/services.dart';
import '../../smm/presentation/smm_guide_screen.dart';
import '../../../core/navigation/support.dart';
import '../../../widgets/aurora_background.dart';
import '../../../widgets/theme_toggle.dart';
import '../../guide/guide_screen.dart';
import '../../legal/legal_screen.dart';
import '../../referral/presentation/referral_screen.dart';
import '../../../core/network/api_exception.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../auth/presentation/complete_profile_screen.dart' show BirthDateField;
import '../../auth/data/auth_repository.dart';

/// tayyorr+ bosh sahifasi va SMM dan ochiladigan profil (alohida sahifa).
class StandaloneProfile extends StatelessWidget {
  const StandaloneProfile({super.key});

  @override
  Widget build(BuildContext context) => const AuroraBackground(child: ProfileScreen());
}

/// Tezkor havolalar: referal, qo'llanma, yordam, mavzu.
class _QuickLinks extends StatelessWidget {
  const _QuickLinks({required this.isPreparer});
  final bool isPreparer;

  @override
  Widget build(BuildContext context) {
    Widget row(TIData icon, String label, Color c, VoidCallback onTap, {String? sub}) => InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            child: Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: c.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(12)),
                child: TIcon(icon, color: c, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(label, style: TextStyle(color: WebC.white, fontSize: 15, fontWeight: FontWeight.w600)),
                  if (sub != null) Text(sub, style: TextStyle(color: WebC.zinc500, fontSize: 12.5)),
                ]),
              ),
              TIcon(TI.chevron_right_rounded, color: WebC.zinc500),
            ]),
          ),
        );
    final service = ServiceScope.of(context);
    // tayyorr+ da qo'llanma va yordam pastki panelda bor — takrorlamaymiz
    final showHelp = service != ServiceKind.plus;
    return WebCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Column(children: [
        // referal — hozircha faqat Tayyorr.uz da
        if (isPreparer && service == ServiceKind.uz)
          row(TI.card_giftcard_rounded, 'Referal', const Color(0xFFF59E0B),
              () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuroraBackground(child: ReferralScreen()))),
              sub: "Döstingizni taklif qiling — har biri uçun +1 star"),
        if (showHelp)
          row(TI.menu_book_rounded, "Qöllanma", const Color(0xFF8B5CF6),
            () => service == ServiceKind.smm
                ? Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SmmGuideScreen()))
                : Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GuideScreen())),
            sub: 'Qanday işlaydi — qadamma-qadam'),
        if (showHelp)
          row(TI.support_agent_rounded, "Yordam", const Color(0xFF10B981), () => openSupportChat(context),
            sub: "Qöllab-quvvatlaş xizmatiga yoziş"),
        const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: ThemeToggle()),
      ]),
    );
  }
}

/// Saytdagi /profile — profil formasi, akkaunt formasi va chiqish.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.select((AuthBloc b) => b.state.user);
    return WebPage(
      background: false,
      children: user == null
          ? const [SBlock(height: 28, width: 120), SizedBox(height: 20), SBlock(height: 380)]
          : [
              WebPageTitle('Profil', size: 24),
              const SizedBox(height: 4),
              Text(
                '@${user.login ?? '—'} · ${user.isPreparer ? 'Tayyorlovçi' : 'Buyurtma beruvçi'}'
                '${(user.email ?? '').isNotEmpty ? ' · ${user.email}' : ''}',
                style: TextStyle(color: WebC.zinc500, fontSize: 14, height: 1.45),
              ),
              const SizedBox(height: 20),
              _QuickLinks(isPreparer: user.isPreparer),
              const SizedBox(height: 16),
              _ProfileForm(key: ValueKey('p-${user.id}')),
              const SizedBox(height: 16),
              _AccountForm(key: ValueKey('a-${user.id}'), initialLogin: user.login ?? ''),
              const SizedBox(height: 8),
              const Center(child: _VersionLabel()),
              const SizedBox(height: 32),
              Container(height: 1, color: WebC.border),
              const SizedBox(height: 24),
              Text(
                "Hisobdan çiqsangiz, qayta kiriş uçun login/parol yoki Google kerak böladi.",
                style: TextStyle(color: WebC.zinc500, fontSize: 14, height: 1.45),
              ),
              const SizedBox(height: 12),
              const Align(alignment: Alignment.centerLeft, child: _SignOutButton()),
              const SizedBox(height: 24),
              Wrap(
                spacing: 6,
                children: [
                  _DocLink(label: 'Foydalaniş şartlari', path: '/terms'),
                  Text('·', style: TextStyle(color: WebC.zinc600, fontSize: 13)),
                  _DocLink(label: 'Maxfiylik siyosati', path: '/privacy'),
                ],
              ),
            ],
    );
  }
}

class _ProfileForm extends StatefulWidget {
  const _ProfileForm({super.key});

  @override
  State<_ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends State<_ProfileForm> {
  final _repo = AuthRepository();
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _about;
  DateTime? _birth;
  bool _busy = false;
  bool _uploading = false;
  Uint8List? _preview;
  String? _msg;
  String? _avatarErr;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthBloc>().state.user;
    _firstName = TextEditingController(text: user?.firstName ?? '');
    _lastName = TextEditingController(text: user?.lastName ?? '');
    _about = TextEditingController(text: user?.about ?? '');
    _birth = DateTime.tryParse(user?.birthDate ?? '');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _about.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800, imageQuality: 85);
    if (file == null) return;
    setState(() {
      _uploading = true;
      _avatarErr = null;
    });
    try {
      final bytes = await file.readAsBytes();
      if (mounted) setState(() => _preview = bytes);
      final ext = file.name.contains('.') ? file.name.split('.').last.toLowerCase() : 'jpg';
      final contentType = switch (ext) {
        'png' => 'image/png',
        'webp' => 'image/webp',
        _ => 'image/jpeg',
      };
      final user = await _repo.uploadAvatar(bytes: bytes, filename: file.name, contentType: contentType);
      if (mounted) context.read<AuthBloc>().add(AuthUserUpdated(user));
    } catch (_) {
      if (mounted) setState(() => _avatarErr = "Rasmni yuklab bölmadi");
    } finally {
      if (mounted) {
        setState(() {
          _uploading = false;
          _preview = null;
        });
      }
    }
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await _repo.updateProfile(
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        about: _about.text.trim(),
        birthDate: _birth == null
            ? null
            : '${_birth!.year}-${_birth!.month.toString().padLeft(2, '0')}-${_birth!.day.toString().padLeft(2, '0')}',
      );
      if (!mounted) return;
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      setState(() => _msg = 'Saqlandi');
    } on ApiException catch (e) {
      if (mounted) setState(() => _msg = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final image = context.select((AuthBloc b) => b.state.user?.image);
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const WebLabel('Glavniy rasm'),
          Row(
            children: [
              Container(
                width: 80,
                height: 80,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: WebC.fill5,
                  border: Border.all(color: WebC.border),
                ),
                alignment: Alignment.center,
                child: _preview != null
                    ? Image.memory(_preview!, width: 80, height: 80, fit: BoxFit.cover)
                    : (image ?? '').isNotEmpty
                    ? Image.network(image!, width: 80, height: 80, fit: BoxFit.cover)
                    : Text("rasm yöq", style: TextStyle(color: WebC.zinc500, fontSize: 12)),
              ),
              const SizedBox(width: 16),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    WebButton(
                      label: _uploading ? 'Yuklanmoqda...' : 'Rasm tanlaş',
                      variant: WebBtn.ghost,
                      onPressed: _uploading ? null : _pickAvatar,
                    ),
                    if (_avatarErr != null) ...[
                      const SizedBox(height: 4),
                      Text(_avatarErr!, style: TextStyle(color: WebC.red, fontSize: 12)),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [const WebLabel('Ism'), WebInput(controller: _firstName)],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [const WebLabel('Familiya'), WebInput(controller: _lastName)],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const WebLabel("Tuğilgan sana"),
          BirthDateField(
            value: _birth,
            onChanged: (d) => setState(() => _birth = d),
          ),
          const SizedBox(height: 12),
          const WebLabel("Qöşimça maʼlumot"),
          WebInput(controller: _about, maxLines: 4, minLines: 4),
          if (_msg != null) ...[
            const SizedBox(height: 12),
            Text(_msg!, style: TextStyle(color: WebC.zinc400, fontSize: 14)),
          ],
          const SizedBox(height: 12),
          WebButton(label: _busy ? '...' : 'Saqlaş', onPressed: _busy ? null : _submit, expand: true),
        ],
      ),
    );
  }
}

class _AccountForm extends StatefulWidget {
  const _AccountForm({super.key, required this.initialLogin});
  final String initialLogin;

  @override
  State<_AccountForm> createState() => _AccountFormState();
}

class _AccountFormState extends State<_AccountForm> {
  late final _login = TextEditingController(text: widget.initialLogin);
  final _pw = TextEditingController();
  final _pw2 = TextEditingController();
  bool _show1 = false;
  bool _show2 = false;
  bool _busy = false;
  (bool, String)? _msg;

  @override
  void dispose() {
    _login.dispose();
    _pw.dispose();
    _pw2.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _msg = null);
    final pw = _pw.text, pw2 = _pw2.text;
    if (pw.isNotEmpty || pw2.isNotEmpty) {
      if (pw.length < 6) {
        setState(() => _msg = (false, 'Parol kamida 6 belgi'));
        return;
      }
      if (pw != pw2) {
        setState(() => _msg = (false, 'Parollar mos emas'));
        return;
      }
    }
    final login = _login.text.trim();
    final loginChanged = login.isNotEmpty && login != widget.initialLogin;
    if (!loginChanged && pw.isEmpty) {
      setState(() => _msg = (false, "Özgartiriş kiritilmadi"));
      return;
    }
    setState(() => _busy = true);
    try {
      await AuthRepository().updateAccount(
        login: loginChanged ? login : null,
        newPassword: pw.isNotEmpty ? pw : null,
      );
      if (!mounted) return;
      context.read<AuthBloc>().add(const AuthMeRefreshRequested());
      _pw.clear();
      _pw2.clear();
      setState(() => _msg = (true, 'Saqlandi'));
    } on ApiException catch (e) {
      if (mounted) setState(() => _msg = (false, e.message));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _eye(bool shown, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: TIcon(shown ? TI.visibility_off_outlined : TI.visibility_outlined, size: 18, color: WebC.zinc500),
      );

  @override
  Widget build(BuildContext context) {
    return WebCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Akkaunt', style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          const WebLabel('Login'),
          WebInput(controller: _login, hint: 'login'),
          const SizedBox(height: 12),
          const WebLabel('Yangi parol'),
          WebInput(
            controller: _pw,
            hint: 'kamida 6 belgi',
            obscure: !_show1,
            suffix: _eye(_show1, () => setState(() => _show1 = !_show1)),
          ),
          const SizedBox(height: 12),
          const WebLabel('Parolni takrorlang'),
          WebInput(
            controller: _pw2,
            obscure: !_show2,
            suffix: _eye(_show2, () => setState(() => _show2 = !_show2)),
          ),
          if (_msg != null) ...[
            const SizedBox(height: 12),
            Text(_msg!.$2, style: TextStyle(color: _msg!.$1 ? WebC.emerald : WebC.red, fontSize: 14)),
          ],
          const SizedBox(height: 12),
          WebButton(label: _busy ? '...' : 'Saqlaş', onPressed: _busy ? null : _save, expand: true),
        ],
      ),
    );
  }
}

class _SignOutButton extends StatelessWidget {
  const _SignOutButton();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final ok = await confirmDialog(
          context,
          title: 'Çiqmoqçimisiz?',
          message: "Hisobingizdan çiqasiz, qaytadan kirişingiz kerak böladi.",
          confirmLabel: 'Ha, çiqiş',
        );
        if (ok == true && context.mounted) context.read<AuthBloc>().add(const AuthLoggedOut());
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 17.6, vertical: 9.6),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444).withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF87171).withValues(alpha: 0.30)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            TIcon(TI.power_settings_new_rounded, size: 18, color: WebC.redSoft),
            const SizedBox(width: 8),
            Text('Hisobdan çiqiş', style: TextStyle(color: WebC.redSoft, fontSize: 14, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

class _DocLink extends StatelessWidget {
  const _DocLink({required this.label, required this.path});
  final String label;
  final String path;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => LegalScreen.open(context, privacy: path == '/privacy'),
      child: Text(label, style: TextStyle(color: WebC.zinc500, fontSize: 13, decoration: TextDecoration.underline)),
    );
  }
}

/// "tayyorr.uz v1.1" — o'rnatilgan versiya.
class _VersionLabel extends StatelessWidget {
  const _VersionLabel();

  /// O'rnatilgan ilovaning haqiqiy versiyasi (APK ichidan) — faqat yangi versiya o'rnatilganda o'zgaradi.
  @override
  Widget build(BuildContext context) {
    final v = AppInfo.short;
    if (v.isEmpty) return const SizedBox(height: 16);
    return Text('tayyorr.uz v$v', style: TextStyle(color: WebC.zinc600, fontSize: 12));
  }
}
