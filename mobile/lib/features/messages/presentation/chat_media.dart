import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:gal/gal.dart';
import 'package:just_audio/just_audio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdfx/pdfx.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../../../core/media/media_cache.dart';
import '../../../widgets/web_ui.dart';
import '../data/message_model.dart';

/// Fayl kengaytmasidan MIME turi.
String mimeForExt(String ext) => switch (ext) {
  'png' => 'image/png',
  'webp' => 'image/webp',
  'gif' => 'image/gif',
  'jpg' || 'jpeg' => 'image/jpeg',
  'mp4' => 'video/mp4',
  'mov' => 'video/quicktime',
  'webm' => 'video/webm',
  '3gp' => 'video/3gpp',
  'mkv' => 'video/x-matroska',
  'mp3' => 'audio/mpeg',
  'm4a' => 'audio/mp4',
  'aac' => 'audio/aac',
  'ogg' || 'oga' || 'opus' => 'audio/ogg',
  'wav' => 'audio/wav',
  'flac' => 'audio/flac',
  'pdf' => 'application/pdf',
  'doc' => 'application/msword',
  'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls' => 'application/vnd.ms-excel',
  'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt' => 'application/vnd.ms-powerpoint',
  'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'txt' => 'text/plain',
  'zip' => 'application/zip',
  'rar' => 'application/vnd.rar',
  _ => 'application/octet-stream',
};

String formatBytes(int b) {
  if (b < 1024) return '$b B';
  if (b < 1024 * 1024) return '${(b / 1024).toStringAsFixed(0)} KB';
  return '${(b / 1024 / 1024).toStringAsFixed(1)} MB';
}

String _mmss(Duration d) {
  final m = d.inMinutes;
  final s = d.inSeconds % 60;
  return '$m:${s.toString().padLeft(2, '0')}';
}

void _toast(BuildContext context, String text) {
  ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(text), duration: const Duration(seconds: 2)));
}

/// Faylni qurilmaga saqlash: rasm/video — galereyaga, qolganlari — foydalanuvchi
/// tanlagan joyga. Fayl avval ilova keshiga yuklanadi.
Future<void> saveChatFile(BuildContext context, ChatFileModel file, String key) async {
  if (kIsWeb) {
    await launchUrl(Uri.parse(file.url), mode: LaunchMode.externalApplication);
    return;
  }
  try {
    final local = await MediaCache.instance.get(key, file.url, file.name);
    if (file.isImage || file.isVideo) {
      if (!await Gal.hasAccess(toAlbum: true)) await Gal.requestAccess(toAlbum: true);
      // galereyada asl nomi bilan ko'rinsin (keshdagi nom oldida xabar id'si bor)
      final tmpDir = await getTemporaryDirectory();
      final named = await local.copy('${tmpDir.path}/${file.name.replaceAll(RegExp(r'[\\/]'), '_')}');
      try {
        if (file.isImage) {
          await Gal.putImage(named.path, album: 'Tayyorr');
        } else {
          await Gal.putVideo(named.path, album: 'Tayyorr');
        }
      } finally {
        if (await named.exists()) await named.delete();
      }
      if (context.mounted) _toast(context, file.isImage ? 'Rasm galereyaga saqlandi' : 'Video galereyaga saqlandi');
      return;
    }
    final saved = await FilePicker.platform.saveFile(fileName: file.name, bytes: await local.readAsBytes());
    if (saved != null && context.mounted) _toast(context, 'Fayl saqlandi');
  } catch (e) {
    debugPrint('fayl saqlanmadi: $e');
    if (context.mounted) _toast(context, "Saqlab bo'lmadi — qayta urinib ko'ring");
  }
}

/// Xabardagi faylni turiga qarab ko'rsatadi.
class ChatAttachment extends StatelessWidget {
  const ChatAttachment({super.key, required this.file, required this.cacheKey, required this.mine});
  final ChatFileModel file;
  final String cacheKey;
  final bool mine;

  static const double width = 236;

  @override
  Widget build(BuildContext context) {
    if (file.isImage) return _ImageAttachment(file: file, cacheKey: cacheKey);
    if (file.isVideo) return _VideoAttachment(file: file, cacheKey: cacheKey);
    if (file.isAudio) return AudioAttachment(file: file, cacheKey: cacheKey, mine: mine);
    return _DocAttachment(file: file, cacheKey: cacheKey, mine: mine);
  }
}

// ── Rasm ────────────────────────────────────────────────────────────

class _ImageAttachment extends StatefulWidget {
  const _ImageAttachment({required this.file, required this.cacheKey});
  final ChatFileModel file;
  final String cacheKey;

  @override
  State<_ImageAttachment> createState() => _ImageAttachmentState();
}

class _ImageAttachmentState extends State<_ImageAttachment> {
  File? _local;

  @override
  void initState() {
    super.initState();
    MediaCache.instance.cached(widget.cacheKey, widget.file.name).then((f) {
      if (f != null && mounted) setState(() => _local = f);
    });
  }

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: ChatAttachment.width,
      height: 180,
      color: Colors.black.withValues(alpha: 0.15),
      alignment: Alignment.center,
      child: const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white54),
      ),
    );
    final img = _local != null
        ? Image.file(_local!, fit: BoxFit.cover, width: ChatAttachment.width)
        : Image.network(
            widget.file.url,
            fit: BoxFit.cover,
            width: ChatAttachment.width,
            loadingBuilder: (_, child, p) => p == null ? child : placeholder,
            errorBuilder: (_, __, ___) => SizedBox(
              width: ChatAttachment.width,
              height: 120,
              child: Center(child: Icon(Icons.broken_image_outlined, color: WebC.zinc500)),
            ),
          );
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        PageRouteBuilder(
          opaque: false,
          barrierColor: Colors.black,
          transitionDuration: const Duration(milliseconds: 220),
          pageBuilder: (_, __, ___) => ImageViewerScreen(file: widget.file, cacheKey: widget.cacheKey, local: _local),
          transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
        ),
      ),
      child: Hero(
        tag: 'img-${widget.cacheKey}',
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: ConstrainedBox(constraints: const BoxConstraints(maxHeight: 300, minHeight: 80), child: img),
        ),
      ),
    );
  }
}

/// To'liq ekranda rasm — kattalashtirish, yuklab olish.
class ImageViewerScreen extends StatefulWidget {
  const ImageViewerScreen({super.key, required this.file, required this.cacheKey, this.local});
  final ChatFileModel file;
  final String cacheKey;
  final File? local;

  @override
  State<ImageViewerScreen> createState() => _ImageViewerScreenState();
}

class _ImageViewerScreenState extends State<ImageViewerScreen> with SingleTickerProviderStateMixin {
  final _tc = TransformationController();
  late final AnimationController _zoomAnim = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 220),
  );
  TapDownDetails? _tap;
  double _drag = 0;

  @override
  void dispose() {
    _tc.dispose();
    _zoomAnim.dispose();
    super.dispose();
  }

  void _toggleZoom() {
    final zoomed = _tc.value.getMaxScaleOnAxis() > 1.01;
    final pos = _tap?.localPosition ?? Offset.zero;
    final end = zoomed
        ? Matrix4.identity()
        : (Matrix4.identity()
            ..translateByDouble(-pos.dx * 1.5, -pos.dy * 1.5, 0, 1)
            ..scaleByDouble(2.5, 2.5, 1, 1));
    final anim = Matrix4Tween(
      begin: _tc.value,
      end: end,
    ).animate(CurvedAnimation(parent: _zoomAnim, curve: Curves.easeOut));
    void listener() => _tc.value = anim.value;
    anim.addListener(listener);
    _zoomAnim.forward(from: 0).whenComplete(() => anim.removeListener(listener));
  }

  @override
  Widget build(BuildContext context) {
    final zoomed = _tc.value.getMaxScaleOnAxis() > 1.01;
    final opacity = (1 - (_drag.abs() / 400)).clamp(0.3, 1.0);
    return Scaffold(
      backgroundColor: Colors.black.withValues(alpha: opacity),
      body: Stack(
        children: [
          Positioned.fill(
            child: GestureDetector(
              onDoubleTapDown: (d) => _tap = d,
              onDoubleTap: _toggleZoom,
              // pastga/yuqoriga surib yopish (kattalashtirilmagan holatda)
              onVerticalDragUpdate: zoomed ? null : (d) => setState(() => _drag += d.delta.dy),
              onVerticalDragEnd: zoomed
                  ? null
                  : (d) {
                      if (_drag.abs() > 120 || d.velocity.pixelsPerSecond.dy.abs() > 900) {
                        Navigator.of(context).pop();
                      } else {
                        setState(() => _drag = 0);
                      }
                    },
              child: Transform.translate(
                offset: Offset(0, _drag),
                child: InteractiveViewer(
                  transformationController: _tc,
                  minScale: 1,
                  maxScale: 5,
                  onInteractionEnd: (_) => setState(() {}),
                  child: Center(
                    child: Hero(
                      tag: 'img-${widget.cacheKey}',
                      child: widget.local != null
                          ? Image.file(widget.local!, fit: BoxFit.contain)
                          : Image.network(widget.file.url, fit: BoxFit.contain),
                    ),
                  ),
                ),
              ),
            ),
          ),
          _ViewerTopBar(file: widget.file, cacheKey: widget.cacheKey),
        ],
      ),
    );
  }
}

class _ViewerTopBar extends StatelessWidget {
  const _ViewerTopBar({required this.file, required this.cacheKey});
  final ChatFileModel file;
  final String cacheKey;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: EdgeInsets.fromLTRB(4, MediaQuery.of(context).padding.top + 4, 4, 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
          ),
        ),
        child: Row(
          children: [
            IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close_rounded, color: Colors.white),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    file.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  Text(formatBytes(file.size), style: const TextStyle(color: Colors.white60, fontSize: 12)),
                ],
              ),
            ),
            _DownloadIconButton(file: file, cacheKey: cacheKey),
          ],
        ),
      ),
    );
  }
}

class _DownloadIconButton extends StatefulWidget {
  const _DownloadIconButton({required this.file, required this.cacheKey});
  final ChatFileModel file;
  final String cacheKey;

  @override
  State<_DownloadIconButton> createState() => _DownloadIconButtonState();
}

class _DownloadIconButtonState extends State<_DownloadIconButton> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<double?>(
      valueListenable: MediaCache.instance.progressOf(widget.cacheKey),
      builder: (context, p, _) {
        if (_busy || p != null) {
          return Padding(
            padding: const EdgeInsets.all(12),
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.4, value: p, color: Colors.white),
            ),
          );
        }
        return IconButton(
          tooltip: 'Yuklab olish',
          onPressed: () async {
            setState(() => _busy = true);
            await saveChatFile(context, widget.file, widget.cacheKey);
            if (mounted) setState(() => _busy = false);
          },
          icon: const Icon(Icons.download_rounded, color: Colors.white),
        );
      },
    );
  }
}

// ── Video ───────────────────────────────────────────────────────────

class _VideoAttachment extends StatelessWidget {
  const _VideoAttachment({required this.file, required this.cacheKey});
  final ChatFileModel file;
  final String cacheKey;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => VideoPlayerScreen(file: file, cacheKey: cacheKey),
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Container(
          width: ChatAttachment.width,
          height: 150,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1E1B4B), Color(0xFF0B0B12)],
            ),
          ),
          child: Stack(
            children: [
              Center(
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black.withValues(alpha: 0.45),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 32),
                ),
              ),
              Positioned(
                left: 10,
                right: 10,
                bottom: 8,
                child: Row(
                  children: [
                    const Icon(Icons.videocam_rounded, size: 14, color: Colors.white70),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        file.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(formatBytes(file.size), style: const TextStyle(color: Colors.white60, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Ilova ichida video ijro etish.
class VideoPlayerScreen extends StatefulWidget {
  const VideoPlayerScreen({super.key, required this.file, required this.cacheKey});
  final ChatFileModel file;
  final String cacheKey;

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  VideoPlayerController? _c;
  bool _controls = true;
  String? _error;
  Timer? _hide;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    // audio pleer ijro etayotgan bo'lsa — to'xtatamiz
    ChatAudio.pause();
    final local = await MediaCache.instance.cached(widget.cacheKey, widget.file.name);
    final c = local != null
        ? VideoPlayerController.file(local)
        : VideoPlayerController.networkUrl(Uri.parse(widget.file.url));
    try {
      await c.initialize();
      if (!mounted) {
        await c.dispose();
        return;
      }
      c.addListener(() {
        if (mounted) setState(() {});
      });
      setState(() => _c = c);
      await c.play();
      _scheduleHide();
    } catch (_) {
      await c.dispose();
      if (mounted) setState(() => _error = "Videoni ochib bo'lmadi");
    }
  }

  void _scheduleHide() {
    _hide?.cancel();
    _hide = Timer(const Duration(seconds: 3), () {
      if (mounted && (_c?.value.isPlaying ?? false)) setState(() => _controls = false);
    });
  }

  @override
  void dispose() {
    _hide?.cancel();
    _c?.dispose();
    super.dispose();
  }

  void _togglePlay() {
    final c = _c;
    if (c == null) return;
    if (c.value.isPlaying) {
      c.pause();
    } else {
      if (c.value.position >= c.value.duration) c.seekTo(Duration.zero);
      c.play();
    }
    _scheduleHide();
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          setState(() => _controls = !_controls);
          if (_controls) _scheduleHide();
        },
        child: Stack(
          children: [
            Center(
              child: _error != null
                  ? Text(_error!, style: const TextStyle(color: Colors.white70))
                  : c == null
                  ? const SizedBox(
                      width: 34,
                      height: 34,
                      child: CircularProgressIndicator(strokeWidth: 2.6, color: Colors.white),
                    )
                  : AspectRatio(aspectRatio: c.value.aspectRatio, child: VideoPlayer(c)),
            ),
            if (c != null && c.value.isBuffering)
              const Center(child: CircularProgressIndicator(strokeWidth: 2.6, color: Colors.white)),
            AnimatedOpacity(
              opacity: _controls ? 1 : 0,
              duration: const Duration(milliseconds: 200),
              child: IgnorePointer(
                ignoring: !_controls,
                child: Stack(
                  children: [
                    _ViewerTopBar(file: widget.file, cacheKey: widget.cacheKey),
                    if (c != null)
                      Center(
                        child: GestureDetector(
                          onTap: _togglePlay,
                          child: Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.black.withValues(alpha: 0.5),
                            ),
                            child: Icon(
                              c.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 40,
                            ),
                          ),
                        ),
                      ),
                    if (c != null)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: Container(
                          padding: EdgeInsets.fromLTRB(16, 24, 16, MediaQuery.of(context).padding.bottom + 16),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
                            ),
                          ),
                          child: Row(
                            children: [
                              Text(_mmss(c.value.position), style: const TextStyle(color: Colors.white, fontSize: 12)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: VideoProgressIndicator(
                                  c,
                                  allowScrubbing: true,
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  colors: const VideoProgressColors(
                                    playedColor: Color(0xFF818CF8),
                                    bufferedColor: Colors.white38,
                                    backgroundColor: Colors.white12,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(_mmss(c.value.duration), style: const TextStyle(color: Colors.white, fontSize: 12)),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Audio (Telegram uslubida) ───────────────────────────────────────

/// Butun ilova uchun bitta audio pleer — bir vaqtda faqat bitta audio.
class ChatAudio {
  ChatAudio._();
  static final AudioPlayer player = AudioPlayer();

  /// Hozir yuklangan audio kaliti.
  static final ValueNotifier<String?> current = ValueNotifier<String?>(null);

  static void pause() {
    if (player.playing) player.pause();
  }
}

class AudioAttachment extends StatefulWidget {
  const AudioAttachment({super.key, required this.file, required this.cacheKey, required this.mine});
  final ChatFileModel file;
  final String cacheKey;
  final bool mine;

  @override
  State<AudioAttachment> createState() => _AudioAttachmentState();
}

class _AudioAttachmentState extends State<AudioAttachment> {
  bool _loading = false;
  Duration? _duration;

  // Xabar id'sidan hosil qilingan "to'lqin" — har audioda o'ziga xos, lekin barqaror.
  late final List<double> _bars = () {
    final r = math.Random(widget.cacheKey.hashCode);
    return List.generate(34, (i) => 0.25 + r.nextDouble() * 0.75);
  }();

  bool get _isCurrent => ChatAudio.current.value == widget.cacheKey;

  /// To'lqin chizig'i kengligi: umumiy kenglik − tugma (42) − oraliq (10).
  static const double _waveWidth = ChatAttachment.width - 52;

  Future<void> _toggle() async {
    final p = ChatAudio.player;
    if (_isCurrent) {
      if (p.playing) {
        await p.pause();
      } else {
        if (p.processingState == ProcessingState.completed) await p.seek(Duration.zero);
        unawaited(p.play());
      }
      return;
    }
    setState(() => _loading = true);
    try {
      await p.stop();
      Duration? d;
      if (kIsWeb) {
        d = await p.setUrl(widget.file.url);
      } else {
        final f = await MediaCache.instance.get(widget.cacheKey, widget.file.url, widget.file.name);
        d = await p.setFilePath(f.path);
      }
      ChatAudio.current.value = widget.cacheKey;
      if (mounted) setState(() => _duration = d);
      unawaited(p.play());
    } catch (e) {
      debugPrint('audio ijro etilmadi: $e');
      if (mounted) _toast(context, "Audioni ijro etib bo'lmadi");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _seek(double fraction) {
    if (!_isCurrent) return;
    final d = ChatAudio.player.duration;
    if (d == null) return;
    ChatAudio.player.seek(d * fraction.clamp(0.0, 1.0));
  }

  @override
  Widget build(BuildContext context) {
    final mine = widget.mine;
    final accent = mine ? Colors.white : const Color(0xFF818CF8);
    final fg = mine ? const Color(0xFF4F39F6) : Colors.white;
    final dim = mine ? Colors.white.withValues(alpha: 0.35) : WebC.zinc600;
    final sub = mine ? const Color(0xFFC7D2FE) : WebC.zinc500;

    return SizedBox(
      width: ChatAttachment.width,
      child: ValueListenableBuilder<String?>(
        valueListenable: ChatAudio.current,
        builder: (context, cur, _) {
          final active = cur == widget.cacheKey;
          return StreamBuilder<PlayerState>(
            stream: active ? ChatAudio.player.playerStateStream : const Stream.empty(),
            builder: (context, ps) {
              final playing =
                  active && (ps.data?.playing ?? false) && ps.data?.processingState != ProcessingState.completed;
              return StreamBuilder<Duration>(
                stream: active ? ChatAudio.player.positionStream : const Stream.empty(),
                builder: (context, pos) {
                  final total = (active ? ChatAudio.player.duration : null) ?? _duration;
                  final position = active ? (pos.data ?? Duration.zero) : Duration.zero;
                  final frac = total == null || total.inMilliseconds == 0
                      ? 0.0
                      : (position.inMilliseconds / total.inMilliseconds).clamp(0.0, 1.0);
                  return Row(
                    children: [
                      GestureDetector(
                        onTap: _loading ? null : _toggle,
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(shape: BoxShape.circle, color: accent),
                          child: _loading
                              ? ValueListenableBuilder<double?>(
                                  valueListenable: MediaCache.instance.progressOf(widget.cacheKey),
                                  builder: (_, p, __) => Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: CircularProgressIndicator(strokeWidth: 2.4, value: p, color: fg),
                                  ),
                                )
                              : Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded, color: fg, size: 28),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // kenglik qat'iy (pufakcha IntrinsicWidth ichida — LayoutBuilder ishlatib bo'lmaydi)
                            GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTapDown: (d) => _seek(d.localPosition.dx / _waveWidth),
                              onHorizontalDragUpdate: (d) => _seek(d.localPosition.dx / _waveWidth),
                              child: SizedBox(
                                width: _waveWidth,
                                height: 26,
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    for (var i = 0; i < _bars.length; i++)
                                      Expanded(
                                        child: Center(
                                          child: Container(
                                            width: 2.4,
                                            height: 4 + 20 * _bars[i],
                                            decoration: BoxDecoration(
                                              color: (i + 0.5) / _bars.length <= frac ? accent : dim,
                                              borderRadius: BorderRadius.circular(2),
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              active && total != null
                                  ? '${_mmss(position)} / ${_mmss(total)}'
                                  : total != null
                                  ? _mmss(total)
                                  : '${formatBytes(widget.file.size)} · ${widget.file.ext.toUpperCase()}',
                              style: TextStyle(
                                color: sub,
                                fontSize: 11,
                                fontFeatures: const [FontFeature.tabularFigures()],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}

// ── Hujjat va boshqa fayllar ────────────────────────────────────────

class _DocAttachment extends StatefulWidget {
  const _DocAttachment({required this.file, required this.cacheKey, required this.mine});
  final ChatFileModel file;
  final String cacheKey;
  final bool mine;

  @override
  State<_DocAttachment> createState() => _DocAttachmentState();
}

class _DocAttachmentState extends State<_DocAttachment> {
  bool _cached = false;

  @override
  void initState() {
    super.initState();
    _cached = MediaCache.instance.isKnownCached(widget.cacheKey);
    if (!_cached) {
      MediaCache.instance.cached(widget.cacheKey, widget.file.name).then((f) {
        if (f != null && mounted) setState(() => _cached = true);
      });
    }
  }

  Future<void> _open() async {
    if (kIsWeb) {
      await launchUrl(Uri.parse(widget.file.url), mode: LaunchMode.externalApplication);
      return;
    }
    try {
      final f = await MediaCache.instance.get(widget.cacheKey, widget.file.url, widget.file.name);
      if (!mounted) return;
      setState(() => _cached = true);
      // PDF va matn — ilovaning o'zida; qolgan turlar (Word, Excel, arxiv) — telefondagi mos ilovada
      final ext = widget.file.ext;
      if (ext == 'pdf' || ext == 'txt') {
        await Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ext == 'pdf'
              ? PdfViewerScreen(file: widget.file, cacheKey: widget.cacheKey, local: f)
              : TextViewerScreen(file: widget.file, cacheKey: widget.cacheKey, local: f),
        ));
        return;
      }
      final res = await OpenFilex.open(f.path, type: mimeForExt(widget.file.ext))
          .timeout(const Duration(seconds: 15));
      if (res.type != ResultType.done && mounted) {
        _toast(context, "Bu faylni ochadigan ilova topilmadi — ⋮ menyudan saqlab oling");
      }
    } catch (e) {
      debugPrint('chat fayl ochilmadi: $e');
      if (mounted) _toast(context, "Faylni yuklab bo'lmadi");
    }
  }

  @override
  Widget build(BuildContext context) {
    final mine = widget.mine;
    final accent = mine ? Colors.white : const Color(0xFF818CF8);
    final fg = mine ? const Color(0xFF4F39F6) : Colors.white;
    final ext = widget.file.ext.toUpperCase();
    return GestureDetector(
      onTap: _open,
      child: SizedBox(
        width: ChatAttachment.width,
        child: Row(
          children: [
            ValueListenableBuilder<double?>(
              valueListenable: MediaCache.instance.progressOf(widget.cacheKey),
              builder: (_, p, __) => Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(shape: BoxShape.circle, color: accent),
                alignment: Alignment.center,
                child: p != null
                    ? Padding(
                        padding: const EdgeInsets.all(11),
                        child: CircularProgressIndicator(strokeWidth: 2.4, value: p, color: fg),
                      )
                    : _cached
                    ? Icon(Icons.insert_drive_file_rounded, color: fg, size: 22)
                    : Icon(Icons.arrow_downward_rounded, color: fg, size: 24),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.file.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: mine ? Colors.white : WebC.zinc200,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${formatBytes(widget.file.size)}${ext.isNotEmpty ? ' · $ext' : ''}',
                    style: TextStyle(color: mine ? const Color(0xFFC7D2FE) : WebC.zinc500, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Ilova ichidagi PDF va matn ko'ruvchi ────────────────────────────

class PdfViewerScreen extends StatefulWidget {
  const PdfViewerScreen({super.key, required this.file, required this.cacheKey, required this.local});
  final ChatFileModel file;
  final String cacheKey;
  final File local;

  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  late final PdfControllerPinch _c = PdfControllerPinch(document: PdfDocument.openFile(widget.local.path));
  int _page = 1;
  int _pages = 0;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111116),
      body: Stack(
        children: [
          Positioned(
            top: MediaQuery.of(context).padding.top + 64,
            left: 0,
            right: 0,
            bottom: 0,
            child: PdfViewPinch(
              controller: _c,
              padding: 12,
              backgroundDecoration: const BoxDecoration(color: Color(0xFF111116)),
              onDocumentLoaded: (d) => setState(() => _pages = d.pagesCount),
              onPageChanged: (p) => setState(() => _page = p),
              onDocumentError: (_) => setState(() => _pages = -1),
              builders: PdfViewPinchBuilders<DefaultBuilderOptions>(
                options: const DefaultBuilderOptions(),
                documentLoaderBuilder: (_) => const Center(
                  child: CircularProgressIndicator(strokeWidth: 2.6, color: Colors.white),
                ),
                pageLoaderBuilder: (_) => const Center(
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white38),
                ),
                errorBuilder: (_, __) => const Center(
                  child: Text("PDF'ni ochib bo'lmadi", style: TextStyle(color: Colors.white70)),
                ),
              ),
            ),
          ),
          _ViewerTopBar(file: widget.file, cacheKey: widget.cacheKey),
          if (_pages > 1)
            Positioned(
              bottom: MediaQuery.of(context).padding.bottom + 16,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text('$_page / $_pages', style: const TextStyle(color: Colors.white, fontSize: 13)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class TextViewerScreen extends StatelessWidget {
  const TextViewerScreen({super.key, required this.file, required this.cacheKey, required this.local});
  final ChatFileModel file;
  final String cacheKey;
  final File local;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111116),
      body: Stack(
        children: [
          Positioned.fill(
            child: FutureBuilder<String>(
              future: local.readAsString(),
              builder: (context, snap) {
                if (!snap.hasData) {
                  return snap.hasError
                      ? const Center(child: Text("Faylni o'qib bo'lmadi", style: TextStyle(color: Colors.white70)))
                      : const Center(child: CircularProgressIndicator(strokeWidth: 2.6, color: Colors.white));
                }
                return SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 76, 16, 32),
                  child: SelectableText(snap.data!, style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5)),
                );
              },
            ),
          ),
          _ViewerTopBar(file: file, cacheKey: cacheKey),
        ],
      ),
    );
  }
}
