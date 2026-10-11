import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/progress_ring.dart';
import '../../../widgets/web_ui.dart';
import '../data/message_model.dart';
import 'chat_media.dart';

/// Yuborishdan oldin tanlangan / yozib olingan fayl.
class PendingAttachment {
  PendingAttachment({required this.localKey, required this.name, required this.type, required this.size});

  /// MediaCache'dagi vaqtinchalik kalit (ko'rib chiqish shu fayldan).
  final String localKey;
  final String name;
  final String type;
  final int size;

  /// Yuklash jarayoni 0..1; yuklangach — [prepared] to'ladi.
  double progress = 0;
  Map<String, Object>? prepared;

  bool get ready => prepared != null;

  ChatFileModel get asFile => ChatFileModel(name: name, type: type, size: size, url: '');
}

/// Yuborishdan oldingi ko'rinish: rasm/video/audio/hujjat + yuklanish foizi + ✕.
class PendingAttachmentBar extends StatelessWidget {
  const PendingAttachmentBar({super.key, required this.pending, required this.onCancel});
  final PendingAttachment pending;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(10, 0, 10, 6),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.isLight ? Colors.white.withValues(alpha: 0.9) : const Color(0xFF14141B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: WebC.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // keshdagi mahalliy fayldan — rasm, video, audio (eshitib ko'rish) yoki hujjat
                ChatAttachment(file: pending.asFile, cacheKey: pending.localKey, mine: false),
                if (!pending.ready)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: ProgressRing(value: pending.progress, size: 48),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              GestureDetector(
                onTap: onCancel,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: WebC.fill10),
                  child: Icon(Icons.close_rounded, size: 16, color: WebC.zinc300),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                pending.ready ? formatBytes(pending.size) : '${(pending.progress * 100).round()}%',
                style: TextStyle(color: WebC.zinc500, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Yozish paneli: 📎, matn maydoni va o'ng tugma — matn yoki fayl bo'lsa
/// raketa (yuborish), bo'lmasa mikrofon: bosib turib ovoz yoziladi,
/// qo'yib yuborilganda yozuv ko'rib chiqish uchun [onRecorded] ga beriladi.
class ChatComposer extends StatefulWidget {
  const ChatComposer({
    super.key,
    required this.controller,
    required this.onSend,
    required this.onAttach,
    required this.onRecorded,
    required this.hasAttachment,
    required this.attachmentReady,
  });

  final TextEditingController controller;
  final VoidCallback onSend;
  final VoidCallback? onAttach;
  final void Function(String path, Duration duration) onRecorded;
  final bool hasAttachment;
  final bool attachmentReady;

  @override
  State<ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends State<ChatComposer> {
  final _rec = AudioRecorder();
  bool _recording = false;
  bool _starting = false;
  bool _releasedEarly = false;
  DateTime? _startedAt;
  Duration _elapsed = Duration.zero;
  Timer? _ticker;

  @override
  void dispose() {
    _ticker?.cancel();
    _rec.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (_recording || _starting) return;
    _starting = true;
    _releasedEarly = false;
    try {
      ChatAudio.pause();
      if (!await _rec.hasPermission()) {
        _toast("Mikrofonga ruxsat bering — sozlamalardan yoqishingiz mumkin");
        return;
      }
      // ruxsat oynasi paytida barmoq qo'yib yuborilgan bo'lsa — yozmaymiz
      if (_releasedEarly) return;
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/ovozli-xabar-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _rec.start(const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000, numChannels: 1), path: path);
      HapticFeedback.mediumImpact();
      _startedAt = DateTime.now();
      _ticker = Timer.periodic(const Duration(milliseconds: 200), (_) {
        if (mounted) setState(() => _elapsed = DateTime.now().difference(_startedAt!));
      });
      if (mounted) setState(() => _recording = true);
    } catch (_) {
      _toast("Ovoz yozib bo'lmadi");
    } finally {
      _starting = false;
    }
  }

  Future<void> _stop({bool cancel = false}) async {
    if (!_recording) {
      _releasedEarly = true;
      return;
    }
    _ticker?.cancel();
    final dur = DateTime.now().difference(_startedAt ?? DateTime.now());
    setState(() {
      _recording = false;
      _elapsed = Duration.zero;
    });
    try {
      if (cancel) {
        await _rec.cancel();
        return;
      }
      final path = await _rec.stop();
      if (path == null) return;
      if (dur < const Duration(milliseconds: 600)) {
        _toast('Yozib olish uchun tugmani bosib turing');
        return;
      }
      HapticFeedback.lightImpact();
      widget.onRecorded(path, dur);
    } catch (_) {
      _toast("Ovoz yozib bo'lmadi");
    }
  }

  void _toast(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), duration: const Duration(seconds: 2)));
  }

  String get _mmss {
    final s = _elapsed.inSeconds;
    return '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.isLight ? Colors.white.withValues(alpha: 0.85) : const Color(0xFF0B0B12).withValues(alpha: 0.80),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.isLight ? Colors.black.withValues(alpha: 0.12) : Colors.white.withValues(alpha: 0.15),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                GestureDetector(
                  onTap: _recording ? null : widget.onAttach,
                  child: Container(
                    width: 42,
                    height: 42,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: WebC.fill5,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: WebC.border),
                    ),
                    child: Icon(Icons.attach_file_rounded, size: 20, color: WebC.zinc300),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(child: _recording ? _recordingBar() : _textField()),
                const SizedBox(width: 8),
                ValueListenableBuilder<TextEditingValue>(
                  valueListenable: widget.controller,
                  builder: (context, v, _) {
                    final hasText = v.text.trim().isNotEmpty;
                    if (hasText || widget.hasAttachment) {
                      final enabled = hasText || widget.attachmentReady;
                      return Opacity(
                        opacity: enabled ? 1 : 0.5,
                        child: GestureDetector(
                          onTap: enabled ? widget.onSend : null,
                          child: _roundButton(const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 18)),
                        ),
                      );
                    }
                    // matn yo'q — mikrofon: bosib turib yozish
                    return Listener(
                      onPointerDown: (_) => _start(),
                      onPointerUp: (_) => _stop(),
                      onPointerCancel: (_) => _stop(cancel: true),
                      child: AnimatedScale(
                        scale: _recording ? 1.18 : 1,
                        duration: const Duration(milliseconds: 150),
                        child: _roundButton(
                          const Icon(Icons.mic_rounded, color: Colors.white, size: 22),
                          red: _recording,
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _roundButton(Widget child, {bool red = false}) => Container(
        width: 42,
        height: 42,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: red ? const Color(0xFFEF4444) : null,
          gradient: red
              ? null
              : const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                ),
        ),
        child: child,
      );

  Widget _recordingBar() => Container(
        height: 42,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444).withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(11.2),
          border: Border.all(color: const Color(0xFFF87171).withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            const _BlinkDot(),
            const SizedBox(width: 10),
            Text(
              _mmss,
              style: TextStyle(color: WebC.white, fontSize: 14, fontFeatures: const [FontFeature.tabularFigures()]),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                "Qo'yib yuboring — tayyor",
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: WebC.zinc400, fontSize: 12),
              ),
            ),
          ],
        ),
      );

  Widget _textField() => Container(
        constraints: const BoxConstraints(minHeight: 42, maxHeight: 140),
        padding: const EdgeInsets.symmetric(horizontal: 12.8, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.isLight ? Colors.black.withValues(alpha: 0.03) : Colors.white.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(11.2),
          border: Border.all(color: WebC.border),
        ),
        child: TextField(
          controller: widget.controller,
          minLines: 1,
          maxLines: 5,
          textCapitalization: TextCapitalization.sentences,
          style: TextStyle(color: WebC.white, fontSize: 14, height: 1.5),
          decoration: InputDecoration(
            isDense: true,
            isCollapsed: true,
            contentPadding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            filled: false,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            hintText: widget.hasAttachment ? 'Izoh qo\'shing...' : 'Xabar yozing...',
            hintStyle: TextStyle(color: WebC.zinc500, fontSize: 14, height: 1.5),
          ),
        ),
      );
}

class _BlinkDot extends StatefulWidget {
  const _BlinkDot();

  @override
  State<_BlinkDot> createState() => _BlinkDotState();
}

class _BlinkDotState extends State<_BlinkDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
        opacity: Tween(begin: 0.3, end: 1.0).animate(_c),
        child: Container(
          width: 10,
          height: 10,
          decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFEF4444)),
        ),
      );
}
