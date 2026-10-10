import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

/// Chat fayllarini ilovaning o'z keshiga yuklab oladi va qayta ishlatadi.
///
/// Fayl havolalari vaqtinchalik (presigned, 1 soat) bo'lgani uchun kalit
/// sifatida xabar id'si ishlatiladi — havola o'zgarsa ham fayl qayta
/// yuklanmaydi. Bir faylni bir vaqtda ikki joydan so'rasa, bitta yuklash
/// bo'ladi.
class MediaCache {
  MediaCache._();
  static final MediaCache instance = MediaCache._();

  // Ulanish osilib qolmasin (masalan IPv6 yo'q tarmoqlarda) — aniq vaqt chegaralari.
  final _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(minutes: 2),
  ));
  final _inflight = <String, Future<File>>{};
  final _progress = <String, ValueNotifier<double?>>{};

  /// Keshda borligi aniq bo'lgan kalitlar — sinxron tekshirish uchun.
  final _known = <String>{};

  Directory? _dirCache;

  Future<Directory> _dir() async {
    if (_dirCache != null) return _dirCache!;
    final base = await getApplicationCacheDirectory();
    final d = Directory('${base.path}/chat_files');
    if (!await d.exists()) await d.create(recursive: true);
    return _dirCache = d;
  }

  String _safe(String name) => name.replaceAll(RegExp(r'[^\w.\-]+'), '_');

  Future<File> _fileFor(String key, String name) async => File('${(await _dir()).path}/${key}_${_safe(name)}');

  /// Yuklash jarayoni (0..1), yuklanmayotgan bo'lsa `null`.
  ValueNotifier<double?> progressOf(String key) => _progress.putIfAbsent(key, () => ValueNotifier<double?>(null));

  bool isKnownCached(String key) => _known.contains(key);

  /// Keshda bo'lsa faylni qaytaradi, aks holda `null` (webda doim `null`).
  Future<File?> cached(String key, String name) async {
    if (kIsWeb) return null;
    final f = await _fileFor(key, name);
    if (await f.exists()) {
      _known.add(key);
      return f;
    }
    return null;
  }

  /// Faylni keshdan oladi yoki yuklab, keshga yozadi.
  Future<File> get(String key, String url, String name) {
    // Diqqat: callback hech narsa qaytarmasligi shart — `remove` o'sha Future'ni
    // qaytaradi va whenComplete uni kutib, Future o'zini-o'zi kutib qolardi.
    return _inflight[key] ??= _download(key, url, name).whenComplete(() {
      _inflight.remove(key);
    });
  }

  Future<File> _download(String key, String url, String name) async {
    final f = await _fileFor(key, name);
    if (await f.exists()) {
      _known.add(key);
      return f;
    }
    final tmp = File('${f.path}.part');
    final p = progressOf(key);
    p.value = 0;
    try {
      await _dio.download(url, tmp.path, onReceiveProgress: (r, t) {
        if (t > 0) p.value = r / t;
      });
      await tmp.rename(f.path);
      _known.add(key);
      return f;
    } catch (_) {
      if (await tmp.exists()) await tmp.delete();
      rethrow;
    } finally {
      p.value = null;
    }
  }
}
