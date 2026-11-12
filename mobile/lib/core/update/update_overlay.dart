import 'dart:io';
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../app_config.dart';
import '../app_info.dart';
import '../constants.dart';
import '../../widgets/mascot.dart';

/// Butun ilova ustidagi qatlam:
///  · majburiy yangilanish — ilova ishlamaydi, faqat "Yangilash" oynasi (yopib bo'lmaydi);
///  · ixtiyoriy yangilanish — bir marta (har ochilishda) yopsa bo'ladigan oyna;
///  · texnik ishlar — server 503 qaytarsa.
/// Yangilash ilovaning o'zida: APK yuklanadi (foiz bilan) va Android o'rnatish oynasi ochiladi.
class UpdateOverlay extends StatefulWidget {
  const UpdateOverlay({super.key, required this.child});
  final Widget child;

  @override
  State<UpdateOverlay> createState() => _UpdateOverlayState();
}

class _UpdateOverlayState extends State<UpdateOverlay> {
  bool _softDismissed = false;
  int _tick = 0;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppConfig.instance,
      builder: (context, _) {
        final cfg = AppConfig.instance;
        if (cfg.promptTick != _tick) {
          _tick = cfg.promptTick;
          _softDismissed = false;
        }
        Widget? layer;
        if (cfg.mustUpdate) {
          layer = const _UpdateCard(forced: true);
        } else if (cfg.maintenance != null) {
          layer = _MaintenanceCard(message: cfg.maintenance!);
        } else if (cfg.hasUpdate && !_softDismissed) {
          layer = _UpdateCard(
            forced: false,
            onLater: () => setState(() => _softDismissed = true),
          );
        }
        return Stack(
          children: [
            widget.child,
            if (layer != null)
              Positioned.fill(
                child: Material(
                  type: MaterialType.transparency,
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                          child: Container(
                            color: Colors.black.withValues(alpha: 0.6),
                          ),
                        ),
                      ),
                      Center(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(24),
                          child: layer,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

const _apkType = 'application/vnd.android.package-archive';

class _UpdateCard extends StatefulWidget {
  const _UpdateCard({required this.forced, this.onLater});
  final bool forced;
  final VoidCallback? onLater;

  @override
  State<_UpdateCard> createState() => _UpdateCardState();
}

class _UpdateCardState extends State<_UpdateCard> {
  double? _progress;
  String? _apkPath;
  String? _error;
  CancelToken? _cancel;

  @override
  void dispose() {
    _cancel?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    if (_apkPath != null) return _install();
    final info = AppConfig.instance.update;
    final url = info.apkUrl.isNotEmpty
        ? info.apkUrl
        : '$kSiteUrl/api/app/download';
    setState(() {
      _progress = 0;
      _error = null;
    });
    try {
      final dir = await getTemporaryDirectory();
      final path =
          '${dir.path}/tayyorr-${info.latestBuild > 0 ? info.latestBuild : 'latest'}.apk';
      _cancel = CancelToken();
      await Dio().download(
        url,
        path,
        cancelToken: _cancel,
        onReceiveProgress: (got, total) {
          if (total > 0 && mounted) setState(() => _progress = got / total);
        },
      );
      if (!mounted) return;
      setState(() {
        _apkPath = path;
        _progress = 1;
      });
      await _install();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _progress = null;
        _error = "Yuklab bölmadi. Internetni tekşirib, qayta urinib köring.";
      });
    }
  }

  Future<void> _install() async {
    final path = _apkPath;
    if (path == null || !File(path).existsSync()) {
      setState(() => _apkPath = null);
      return _start();
    }
    final r = await OpenFilex.open(path, type: _apkType);
    if (!mounted) return;
    if (r.type != ResultType.done) {
      setState(
        () => _error =
            "Örnatiş oynasi oçilmadi. Sozlamalarda Tayyorrʼga «Nomaʼlum ilovalarni örnatiş» ruxsatini bering va qayta bosing.",
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final info = AppConfig.instance.update;
    final downloading = _progress != null && _apkPath == null;
    final pct = ((_progress ?? 0) * 100).clamp(0, 100).round();

    return Container(
      constraints: const BoxConstraints(maxWidth: 380),
      padding: const EdgeInsets.fromLTRB(22, 26, 22, 20),
      decoration: BoxDecoration(
        color: const Color(0xFF14141F),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withValues(alpha: 0.35),
            blurRadius: 60,
            spreadRadius: -16,
            offset: const Offset(0, 24),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Tayyor-Man yangilaniş bilan; yuklanayotganda pastida foiz çizig'i
          const Mascot(MascotPose.update, size: 180),
          if (downloading || _apkPath != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: _apkPath != null
                          ? 1
                          : (_progress == 0 ? null : _progress),
                      minHeight: 6,
                      backgroundColor: Colors.white.withValues(alpha: 0.08),
                      valueColor: const AlwaysStoppedAnimation(
                        Color(0xFF8B5CF6),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '${_apkPath != null ? 100 : pct}%',
                  style: const TextStyle(
                    color: Color(0xFFC4B5FD),
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 18),
          Text(
            widget.forced ? 'Yangilaniş çiqdi' : 'Yangi versiya tayyor',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 6,
            runSpacing: 6,
            children: [
              if (AppInfo.short.isNotEmpty)
                _chip('Sizda: v${AppInfo.short}', const Color(0xFF71717A)),
              if (info.latest.isNotEmpty)
                _chip('Yangi: v${info.latest}', const Color(0xFF8B5CF6)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.forced
                ? "Ilovadan foydalanişni davom ettiriş uçun yangi versiyani örnating. Maʼlumotlaringiz va hisobingiz saqlanib qoladi."
                : "Yangi imkoniyatlar va tuzatişlar. Hozir yangilaş tavsiya etiladi — hisobingiz saqlanib qoladi.",
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 14,
              height: 1.45,
            ),
          ),
          if (info.notes.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Nima yangi',
                    style: TextStyle(
                      color: Color(0xFFA5B4FC),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    info.notes,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 13.5,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFFFCA5A5),
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: GestureDetector(
              onTap: downloading ? null : _start,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 15),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: LinearGradient(
                    colors: downloading
                        ? [const Color(0xFF3F3F46), const Color(0xFF3F3F46)]
                        : [const Color(0xFF6366F1), const Color(0xFFA855F7)],
                  ),
                ),
                child: Text(
                  downloading
                      ? 'Yuklanmoqda… $pct%'
                      : _apkPath != null
                      ? "Örnatiş"
                      : 'Yangilaş',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
          if (!widget.forced && !downloading) ...[
            const SizedBox(height: 6),
            TextButton(
              onPressed: widget.onLater,
              child: Text(
                'Keyinroq',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.6),
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _chip(String t, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: c.withValues(alpha: 0.18),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      t,
      style: TextStyle(
        color: c == const Color(0xFF71717A)
            ? Colors.white70
            : const Color(0xFFC4B5FD),
        fontSize: 12,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _MaintenanceCard extends StatefulWidget {
  const _MaintenanceCard({required this.message});
  final String message;

  @override
  State<_MaintenanceCard> createState() => _MaintenanceCardState();
}

class _MaintenanceCardState extends State<_MaintenanceCard> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 380),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF14141F),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Mascot(MascotPose.maintenance, size: 190),
          const SizedBox(height: 12),
          const Text(
            'Texnik işlar',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.message,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.75),
              fontSize: 14,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 18),
          TextButton(
            onPressed: _busy
                ? null
                : () async {
                    setState(() => _busy = true);
                    await AppConfig.instance.load();
                    if (mounted) setState(() => _busy = false);
                  },
            child: Text(
              _busy ? '...' : 'Qayta urinib köriş',
              style: const TextStyle(color: Color(0xFFA5B4FC), fontSize: 15),
            ),
          ),
        ],
      ),
    );
  }
}
