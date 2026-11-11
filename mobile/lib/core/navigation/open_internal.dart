import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/guide/guide_screen.dart';
import '../../features/home/section_cubit.dart';
import '../../features/order_detail/presentation/order_detail_screen.dart';
import '../constants.dart';

/// Saytdagi ichki havola (xabar tugmasi "/wallet", "/orders/ID" va h.k.) — ilovaning
/// mos bo'limini ochadi. Ilovada yo'q sahifa bo'lsa — brauzerda.
Future<void> openInternalUrl(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  if (uri.hasScheme && !uri.host.endsWith('tayyorr.uz')) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
    return;
  }
  final path = uri.path;

  void section(AppSection s) {
    Navigator.of(context).popUntil((r) => r.isFirst);
    SectionCubit.instance.select(s);
  }

  final order = RegExp(r'^/orders/([^/]+)$').firstMatch(path);
  if (order != null && order.group(1) != 'new') {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.group(1)!)));
    return;
  }
  if (path.startsWith('/wallet')) return section(AppSection.wallet);
  if (path.startsWith('/offers')) return section(AppSection.offers);
  if (path.startsWith('/referral')) return section(AppSection.referral);
  if (path.startsWith('/messages')) return section(AppSection.messages);
  if (path.startsWith('/profile')) return section(AppSection.profile);
  if (path == '/dashboard' || path.startsWith('/orders')) return section(AppSection.dashboard);
  if (path.startsWith('/guide')) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GuideScreen()));
    return;
  }
  await launchUrl(Uri.parse(uri.hasScheme ? url : '$kSiteUrl$path'), mode: LaunchMode.externalApplication);
}
