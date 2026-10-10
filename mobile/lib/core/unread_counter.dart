import 'package:flutter/foundation.dart';

import '../features/messages/data/messages_repository.dart';

/// Barcha suhbatlardagi o'qilmagan xabarlar soni — saytdagi menyuda
/// "Xabarlar" yonidagi nishon va menyu tugmasidagi nuqta uchun.
class UnreadCounter extends ValueNotifier<int> {
  UnreadCounter._() : super(0);
  static final instance = UnreadCounter._();

  bool _busy = false;

  Future<void> refresh() async {
    if (_busy) return;
    _busy = true;
    try {
      final list = await MessagesRepository().fetchConversations();
      value = list.fold<int>(0, (sum, c) => sum + c.unread);
    } catch (_) {
      /* tarmoq xatosi — eski qiymat qoladi */
    } finally {
      _busy = false;
    }
  }
}
