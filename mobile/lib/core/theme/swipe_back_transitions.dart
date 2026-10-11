import 'package:flutter/material.dart';

/// Telegramdagidek orqaga qaytish: ichki sahifani chapdan o'ngga surib yopish.
///
/// Flutter'ning iOS uslubidagi o'tishi faqat ekran chetidagi ~20px dan
/// suriladi. Bu yerda surish maydonini ekranning chap yarmigacha kengaytiramiz:
/// Cupertino maydon kengligini MediaQuery'ning chap `padding`idan oladi —
/// shuning uchun tashqariga kengaytirilgan padding beramiz, sahifaning
/// o'ziga esa asl qiymat qaytariladi (SafeArea buzilmasin).
class SwipeBackPageTransitionsBuilder extends PageTransitionsBuilder {
  const SwipeBackPageTransitionsBuilder();

  static const _cupertino = CupertinoPageTransitionsBuilder();

  @override
  Duration get transitionDuration => _cupertino.transitionDuration;

  @override
  DelegatedTransitionBuilder? get delegatedTransition => _cupertino.delegatedTransition;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final mq = MediaQuery.of(context);
    final dragWidth = mq.size.width * 0.5;
    final widened = mq.copyWith(
      padding: mq.padding.copyWith(left: dragWidth > mq.padding.left ? dragWidth : mq.padding.left),
    );
    return MediaQuery(
      data: widened,
      child: _cupertino.buildTransitions<T>(
        route,
        context,
        animation,
        secondaryAnimation,
        MediaQuery(data: mq, child: child),
      ),
    );
  }
}
