import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/format.dart';
import '../../../widgets/skeleton.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../dashboard/data/order_model.dart';
import '../../messages/data/message_model.dart';
import '../../messages/data/messages_repository.dart';
import '../../messages/presentation/chat_screen.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../cubit/public_profile_cubit.dart';
import '../data/public_profile_model.dart';
import '../data/public_profile_repository.dart';

class PublicProfileScreen extends StatelessWidget {
  const PublicProfileScreen({super.key, required this.userId});
  final String userId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => PublicProfileCubit(PublicProfileRepository(), userId),
      child: const _PublicProfileView(),
    );
  }
}

class _PublicProfileView extends StatelessWidget {
  const _PublicProfileView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PublicProfileCubit, PublicProfileState>(
      builder: (context, state) {
        final p = state.profile;
        final List<Widget> body;
        if (state.status == PublicProfileStatus.loading) {
          body = const [
            Row(children: [SCircle(size: 80), SizedBox(width: 16), SBar(width: 140, height: 18)]),
            SBlock(height: 130),
            SBlock(height: 80),
          ];
        } else if (state.status == PublicProfileStatus.failure || p == null) {
          body = [
            WebCard(child: Text(state.error ?? 'Topilmadi', style: TextStyle(color: WebC.zinc500, fontSize: 14))),
          ];
        } else if (p.blockedMe) {
          body = [
            Row(
              children: [
                _AvatarCircle(
                  child: Icon(Icons.block_rounded, size: 32, color: WebC.zinc500),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(p.displayName,
                      style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            if ((p.about ?? '').isNotEmpty)
              WebCard(child: Text(p.about!, style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45))),
          ];
        } else {
          final isMe = context.read<AuthBloc>().state.user?.id == p.id;
          body = [
            _Head(p: p),
            if (!isMe)
              WebButton(
                label: 'Xabar yozish',
                variant: WebBtn.ghost,
                expand: true,
                onPressed: () => _openChat(context, p),
              ),
            WebCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _InfoRow(
                    label: 'Email',
                    value: p.email == null
                        ? const Text('—')
                        : p.email!.full
                            ? Text(p.email!.visible)
                            : Text.rich(TextSpan(children: [
                                TextSpan(text: p.email!.visible),
                                WidgetSpan(
                                  alignment: PlaceholderAlignment.middle,
                                  child: ImageFiltered(
                                    imageFilter: ImageFilter.blur(sigmaX: 3, sigmaY: 3),
                                    child: Text('•' * p.email!.hiddenLen,
                                        style: TextStyle(color: WebC.zinc200, fontSize: 14)),
                                  ),
                                ),
                              ])),
                  ),
                  Container(height: 1, color: WebC.fill5),
                  _InfoRow(label: "Ro'yxatdan o'tgan", value: Text(shortDate(p.createdAt))),
                  Container(height: 1, color: WebC.fill5),
                  _InfoRow(
                    label: p.isPreparer ? 'Olingan ishlar' : 'Berilgan buyurtmalar',
                    value: Text('${p.isPreparer ? p.ordersTaken : p.ordersCreated}'),
                  ),
                  if ((p.about ?? '').isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(p.about!, style: TextStyle(color: WebC.zinc300, fontSize: 14, height: 1.45)),
                  ],
                ],
              ),
            ),
            if (p.role != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '${p.isPreparer ? "Bajarilgan ishlar" : "Berilgan buyurtmalar"} (${p.doneOrders.length})',
                    style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  if (p.doneOrders.isEmpty)
                    WebCard(child: Text("Hozircha yo'q.", style: TextStyle(color: WebC.zinc500, fontSize: 14)))
                  else
                    for (final o in p.doneOrders)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _DoneOrderTile(order: o, isPreparer: p.isPreparer),
                      ),
                ],
              ),
          ];
        }
        return WebPage(
          gap: 24,
          onRefresh: () => context.read<PublicProfileCubit>().load(),
          children: [
            const Align(alignment: Alignment.centerLeft, child: WebBackLink()),
            ...body,
          ],
        );
      },
    );
  }
}

class _AvatarCircle extends StatelessWidget {
  const _AvatarCircle({this.child});
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: WebC.fill5,
        border: Border.all(color: WebC.border),
      ),
      child: child,
    );
  }
}

class _Head extends StatelessWidget {
  const _Head({required this.p});
  final PublicProfileModel p;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _AvatarCircle(
          child: (p.image ?? '').isNotEmpty ? Image.network(p.image!, width: 80, height: 80, fit: BoxFit.cover) : null,
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(p.name ?? '—', style: TextStyle(color: WebC.white, fontSize: 20, fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(
                '@${p.login ?? "—"} · ${p.role == "PREPARER" ? "Tayyorlovchi" : p.role == "ORDERER" ? "Buyurtma beruvchi" : "—"}',
                style: TextStyle(color: WebC.zinc500, fontSize: 14),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: p.online ? WebC.emerald : WebC.zinc600,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(p.presenceText,
                        style: TextStyle(color: p.online ? WebC.emerald : WebC.zinc500, fontSize: 12)),
                  ),
                ],
              ),
              if (p.isPreparer) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    WebStars(value: p.rating ?? 0, size: 16),
                    const SizedBox(width: 8),
                    Text(p.ratingCount > 0 ? p.rating!.toStringAsFixed(1) : '—',
                        style: TextStyle(color: WebC.zinc300, fontSize: 14)),
                    const SizedBox(width: 8),
                    Text('(${p.ratingCount} baho)', style: TextStyle(color: WebC.zinc500, fontSize: 12)),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

Future<void> _openChat(BuildContext context, PublicProfileModel p) async {
  final navigator = Navigator.of(context);
  final messenger = ScaffoldMessenger.of(context);
  try {
    final convId = await MessagesRepository().startConversation(p.id);
    if (!context.mounted) return;
    navigator.push(MaterialPageRoute(
      builder: (_) => ChatScreen(
        conversationId: convId,
        other: ChatOtherUser(id: p.id, name: p.displayName, login: p.login, image: p.image, isSupport: false),
      ),
    ));
  } catch (_) {
    messenger.showSnackBar(const SnackBar(content: Text("Suhbat ochilmadi — qayta urinib ko'ring")));
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final Widget value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Text(label, style: TextStyle(color: WebC.zinc500, fontSize: 14)),
          const SizedBox(width: 16),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: DefaultTextStyle.merge(
                style: TextStyle(color: WebC.zinc200, fontSize: 14),
                textAlign: TextAlign.right,
                child: value,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DoneOrderTile extends StatelessWidget {
  const _DoneOrderTile({required this.order, required this.isPreparer});
  final PublicOrderModel order;
  final bool isPreparer;

  @override
  Widget build(BuildContext context) {
    return WebCard(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(order.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: WebC.white, fontSize: 16, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(
                      '${kOrderTypeLabel[order.type] ?? order.type} · ${shortDate(order.date)}'
                      '${!isPreparer ? " · ${kOrderStatusLabel[order.status] ?? order.status}" : ""}',
                      style: TextStyle(color: WebC.zinc500, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              if (isPreparer)
                order.reviewStars != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          WebStars(value: order.reviewStars!.toDouble()),
                          Text('${order.reviewStars}.0', style: TextStyle(color: WebC.zinc400, fontSize: 12)),
                        ],
                      )
                    : Text('baholanmagan', style: TextStyle(color: WebC.zinc600, fontSize: 12)),
            ],
          ),
          if (isPreparer && (order.reviewComment ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('«${order.reviewComment}»', style: TextStyle(color: WebC.zinc400, fontSize: 14)),
          ],
        ],
      ),
    );
  }
}
