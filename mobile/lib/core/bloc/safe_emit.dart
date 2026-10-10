import 'package:flutter_bloc/flutter_bloc.dart';

/// Sahifa yopilgandan keyin kelgan tarmoq javobi `emit` qilmasin
/// ("Cannot emit new states after calling close" xatosining oldini oladi).
mixin SafeEmit<S> on BlocBase<S> {
  @override
  void emit(S state) {
    if (isClosed) return;
    super.emit(state);
  }
}
