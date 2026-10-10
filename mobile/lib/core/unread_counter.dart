import 'package:flutter/foundation.dart';

import '../features/messages/data/messages_repository.dart';
import 'notifications/message_notifier.dart';

/// Barcha suhbatlardagi o'qilmagan xabarlar soni — saytdagi menyuda
/// "Xabarlar" yonidagi nishon va menyu tugmasidagi nuqta uchun.
class UnreadCounter extends ValueNotifier<int> {
  UnreadCounter._() : super(0);
  static final instance = UnreadCounter._();

  bool _busy = false;

  /// Oldingi so'rovdagi har suhbat o'qilmaganlari — ko'payganini aniqlash uchun.
  /// Birinchi so'rovda (null) bildirishnoma bermaymiz — faqat yangilariga.
  Map<String, int>? _prev;

  /// Tizimdan chiqqanda — keyingi foydalanuvchi uchun noldan boshlanadi.
  void reset() {
    _prev = null;
    value = 0;
  }

  Future<void> refresh() async {
    if (_busy) return;
    _busy = true;
    try {
      final list = await MessagesRepository().fetchConversations();
      value = list.fold<int>(0, (sum, c) => sum + c.unread);
      final prev = _prev;
      if (prev != null) {
        for (final c in list) {
          final grew = c.unread > (prev[c.id] ?? 0);
          // ochiq turgan suhbatga kelgan xabar uchun chat o'zi "tin" chaladi
          if (grew && c.lastMessageMine != true && MessageNotifier.instance.activeConversationId != c.id) {
            MessageNotifier.instance.showMessage(c);
          }
        }
      }
      _prev = {for (final c in list) c.id: c.unread};
    } catch (_) {
      /* tarmoq xatosi — eski qiymat qoladi */
    } finally {
      _busy = false;
    }
  }
}
