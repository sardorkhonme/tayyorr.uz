import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/constants.dart';
import '../../core/network/api_client.dart';

/// tayyorr+ (plus.tayyorr.uz) — ilova ichida (MyGov kabi). Foydalanuvchi bir martalik
/// kalit bilan avtomatik kiritiladi: WebView'da Google bilan kirish bloklangani uchun.
class PlusWebViewScreen extends StatefulWidget {
  const PlusWebViewScreen({super.key});

  static Future<void> open(BuildContext context) =>
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PlusWebViewScreen()));

  @override
  State<PlusWebViewScreen> createState() => _PlusWebViewScreenState();
}

class _PlusWebViewScreenState extends State<PlusWebViewScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _canGoBack = false;

  static final _plusHost = Uri.parse(kPlusUrl).host;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF7F7FB))
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (p) => mounted ? setState(() => _progress = p) : null,
        onPageFinished: (_) async {
          final back = await _controller.canGoBack();
          if (mounted) setState(() => _canGoBack = back);
        },
        onNavigationRequest: _onNavigation,
      ));
    _start();
  }

  /// Bir martalik kalit bilan ochamiz; olinmasa — oddiy sahifa (u yerda login qilinadi).
  Future<void> _start() async {
    var url = kPlusUrl;
    try {
      final res = await ApiClient.instance.post('/mobile/plus-ticket');
      final ticket = res['ticket'] as String?;
      if (ticket != null && ticket.isNotEmpty) {
        url = '$kPlusUrl/app-login?ticket=${Uri.encodeQueryComponent(ticket)}';
      }
    } catch (_) {}
    await _controller.loadRequest(Uri.parse(url));
  }

  NavigationDecision _onNavigation(NavigationRequest request) {
    final uri = Uri.tryParse(request.url);
    if (uri == null) return NavigationDecision.prevent;
    // tayyorr.uz ning o'ziga havola — ilovaga qaytamiz (u ilovaning o'zi)
    if (uri.host == 'tayyorr.uz' || uri.host == 'www.tayyorr.uz') {
      Navigator.of(context).maybePop();
      return NavigationDecision.prevent;
    }
    final isWeb = uri.scheme == 'http' || uri.scheme == 'https';
    // telefon, email, Telegram, Click ilovasi (intent:) va h.k. — tashqarida
    if (!isWeb || uri.host == 't.me' || uri.host.endsWith('.t.me')) {
      launchUrl(uri, mode: LaunchMode.externalApplication).catchError((_) => false);
      return NavigationDecision.prevent;
    }
    return NavigationDecision.navigate;
  }

  Future<bool> _goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_canGoBack,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _goBack() && context.mounted) Navigator.of(context).pop();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF7F7FB),
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          elevation: 0,
          foregroundColor: const Color(0xFF16161D),
          leading: IconButton(
            icon: Icon(_canGoBack ? Icons.arrow_back_rounded : Icons.close_rounded),
            tooltip: _canGoBack ? 'Orqaga' : 'Yopish',
            onPressed: () async {
              if (await _goBack() && context.mounted) Navigator.of(context).pop();
            },
          ),
          titleSpacing: 0,
          title: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset('assets/plus-mark.png', height: 28, filterQuality: FilterQuality.high),
              const SizedBox(width: 8),
              const Text.rich(
                TextSpan(children: [
                  TextSpan(text: 'tayyorr'),
                  TextSpan(text: '+', style: TextStyle(color: Color(0xFFD946EF))),
                ]),
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              tooltip: 'Yangilash',
              onPressed: () => _controller.reload(),
            ),
            IconButton(
              icon: const Icon(Icons.open_in_new_rounded),
              tooltip: 'Brauzerda ochish',
              onPressed: () async {
                final current = await _controller.currentUrl();
                final u = Uri.parse(current ?? kPlusUrl);
                // bir martalik kalitni tashqariga chiqarmaymiz
                final safe = u.host == _plusHost && u.path == '/app-login' ? Uri.parse(kPlusUrl) : u;
                await launchUrl(safe, mode: LaunchMode.externalApplication);
              },
            ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(2),
            child: _progress < 100
                ? LinearProgressIndicator(
                    value: _progress / 100,
                    minHeight: 2,
                    backgroundColor: Colors.transparent,
                    color: const Color(0xFF8B5CF6),
                  )
                : const SizedBox(height: 2),
          ),
        ),
        body: SafeArea(top: false, child: WebViewWidget(controller: _controller)),
      ),
    );
  }
}
