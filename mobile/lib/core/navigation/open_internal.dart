import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/dashboard/presentation/create_order_screen.dart';
import '../../features/guide/guide_screen.dart';
import '../../features/home/section_cubit.dart';
import '../../features/legal/legal_screen.dart';
import '../../features/order_detail/presentation/order_detail_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/public_profile/presentation/public_profile_screen.dart';
import '../../features/smm/presentation/smm_guide_screen.dart';
import '../../features/smm/presentation/smm_order_detail_screen.dart';
import '../../features/wallet/presentation/wallet_screen.dart';
import 'services.dart';
import 'support.dart';

/// Tayyorr havolasi (xabar tugmasi "/wallet", e'lon, çatdagi havola, qo'llanma va h.k.) — ilovaning
/// mos ekranini ochadi. Butun tizim ilovada: app., plus., smm. va tayyorr.uz sahifalari saytga chiqarilmaydi.
/// Faqat begona saytlar — ilova ichidagi brauzer oynasida.
Future<void> openInternalUrl(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  final host = uri.host.toLowerCase();
  if (uri.hasScheme && host.isNotEmpty && host != 'tayyorr.uz' && !host.endsWith('.tayyorr.uz')) {
    final ok = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    if (!ok) await launchUrl(uri, mode: LaunchMode.externalApplication);
    return;
  }
  final seg = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  final path = '/${seg.join('/')}';
  void push(Widget w) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => w));

  // Tayyorr SMM
  if (host.startsWith('smm.')) {
    if (seg.length >= 2 && seg[0] == 'orders') return push(SmmOrderDetailScreen(id: seg[1]));
    if (path.startsWith('/orders')) return openSmm(2);
    if (path.startsWith('/chegirmalar')) return openSmm(1);
    if (path.startsWith('/qollanma')) return push(const SmmGuideScreen());
    if (path.startsWith('/wallet')) return openSmm(3);
    if (path.startsWith('/support')) return openSupportChat(context);
    if (path.startsWith('/account')) return push(const StandaloneProfile());
    return openSmm(0);
  }
  // tayyorr+
  if (host.startsWith('plus.')) {
    if (path.startsWith('/wallet') || path.startsWith('/pay')) return push(const StandaloneWallet());
    if (path.startsWith('/account')) return push(const StandaloneProfile());
    if (path.startsWith('/support')) return openSupportChat(context);
    if (path.startsWith('/smm') || path.startsWith('/orders')) return openSmm(path.startsWith('/orders') ? 2 : 0);
    return openHub();
  }

  // Tayyorr.uz (app.tayyorr.uz / tayyorr.uz / nisbiy yo'l)
  if (seg.length >= 2 && seg[0] == 'orders' && seg[1] != 'new') return push(OrderDetailScreen(orderId: seg[1]));
  if (path == '/orders/new') return push(const CreateOrderScreen());
  if (seg.length >= 2 && seg[0] == 'u') return push(PublicProfileScreen(userId: seg[1]));
  if (path.startsWith('/terms')) return LegalScreen.open(context);
  if (path.startsWith('/privacy')) return LegalScreen.open(context, privacy: true);
  if (path.startsWith('/guide')) return push(const GuideScreen());
  if (path.startsWith('/support')) return openSupportChat(context);
  if (path.startsWith('/wallet')) return openUzSection(AppSection.wallet);
  if (path.startsWith('/offers')) return openUzSection(AppSection.offers);
  if (path.startsWith('/referral')) return openUzSection(AppSection.referral);
  if (path.startsWith('/messages')) return openUzSection(AppSection.messages);
  if (path.startsWith('/profile')) return openUzSection(AppSection.profile);
  if (path == '/dashboard' || path.startsWith('/orders')) return openUzSection(AppSection.dashboard);
  // boshqa (landing va h.k.) — bosh sahifa
  return openHub();
}
