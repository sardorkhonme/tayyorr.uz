import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import 'app_header_sliver.dart';
import 'aurora_background.dart';

/// Ichki (push qilingan) sahifa — saytdagidek tepada header, ostida
/// 12px chekka bilan kontent. `children` ustma-ust (Column) joylanadi.
class WebPage extends StatelessWidget {
  const WebPage({
    super.key,
    required this.children,
    this.onRefresh,
    this.gap = 0,
    this.bottom,
  });

  final List<Widget> children;
  final Future<void> Function()? onRefresh;
  final double gap;

  /// Ekran pastiga yopishgan qism (masalan chat yozish maydoni).
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    Widget scroll = CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        const AppHeaderSliver(),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(12, 20, 12, 40),
          sliver: SliverList.list(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0 && gap > 0) SizedBox(height: gap),
                children[i],
              ],
            ],
          ),
        ),
      ],
    );
    if (onRefresh != null) {
      scroll = RefreshIndicator(onRefresh: onRefresh!, color: AppColors.indigo, edgeOffset: 80, child: scroll);
    }
    return AuroraBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: scroll,
        bottomNavigationBar: bottom,
      ),
    );
  }
}
