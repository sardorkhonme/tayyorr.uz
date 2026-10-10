import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    required this.label,
    required this.controller,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.maxLines = 1,
    this.autofillHints,
  });

  final String label;
  final TextEditingController controller;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int maxLines;
  final Iterable<String>? autofillHints;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late bool _hidden = widget.obscureText;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12.8, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 5.6),
        TextField(
          controller: widget.controller,
          obscureText: widget.obscureText && _hidden,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          maxLines: widget.obscureText ? 1 : widget.maxLines,
          autofillHints: widget.autofillHints,
          style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
          decoration: widget.obscureText
              ? InputDecoration(
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _hidden = !_hidden),
                    icon: Icon(
                      _hidden ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                      size: 19,
                      color: AppColors.textFaint,
                    ),
                  ),
                )
              // null bo'lsa Flutter bezakni butunlay o'chirib qo'yadi (ramka ham,
              // fon ham chizilmaydi) — shuning uchun doim mavzudagi bezak.
              : const InputDecoration(),
        ),
      ],
    );
  }
}
