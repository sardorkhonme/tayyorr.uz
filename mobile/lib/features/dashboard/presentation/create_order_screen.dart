import 'package:flutter/material.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../widgets/date_time_picker.dart';
import '../../../widgets/web_page.dart';
import '../../../widgets/web_ui.dart';
import '../../order_detail/presentation/order_detail_screen.dart';
import '../data/order_model.dart';
import '../data/orders_repository.dart';

/// Saytdagi /orders/new bilan bir xil forma.
class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _budget = TextEditingController();
  final _repo = OrdersRepository();
  String _type = 'PRESENTATION';
  DateTime? _deadline;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final picked = await pickDateTime(context, initial: _deadline);
    if (picked != null) setState(() => _deadline = picked);
  }

  Future<void> _submit() async {
    if (_title.text.trim().length < 5) {
      setState(() => _error = "Sarlavha kamida 5 ta belgidan iborat bo'lsin");
      return;
    }
    if (_description.text.trim().length < 10) {
      setState(() => _error = "Tavsif kamida 10 ta belgidan iborat bo'lsin");
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await _repo.createOrder(
        title: _title.text.trim(),
        type: _type,
        description: _description.text.trim(),
        budget: _budget.text.trim().isEmpty ? null : int.tryParse(_budget.text.trim()),
        deadline: _deadline,
      );
      if (!mounted) return;
      // saytdagidek: yaratilgan buyurtma sahifasiga (replace — "orqaga" formaga qaytmasin)
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: id)),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }


  @override
  Widget build(BuildContext context) {
    return WebPage(
      children: [
        const WebBackLink(),
        const SizedBox(height: 16),
        Text('Yangi buyurtma',
            style: TextStyle(color: WebC.white, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: -0.4)),
        const SizedBox(height: 20),
        WebCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const WebLabel('Sarlavha'),
              WebInput(controller: _title),
              const SizedBox(height: 12),
              const WebLabel('Turi'),
              DropdownButtonFormField<String>(
                initialValue: _type,
                isExpanded: true,
                dropdownColor: AppColors.isLight ? Colors.white : const Color(0xFF141419),
                icon: Icon(Icons.keyboard_arrow_down_rounded, color: WebC.zinc300),
                style: TextStyle(color: WebC.zinc200, fontSize: 14),
                decoration: webInputDecoration(),
                items: [
                  for (final e in kOrderTypeLabel.entries) DropdownMenuItem(value: e.key, child: Text(e.value)),
                ],
                onChanged: (v) => setState(() => _type = v ?? _type),
              ),
              const SizedBox(height: 12),
              const WebLabel('Tavsif'),
              WebInput(controller: _description, hint: 'Mavzu, talablar, hajm, formatlash...', maxLines: 5, minLines: 5),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const WebLabel('Muddat (sana va vaqt)'),
                        WebInput(
                          readOnly: true,
                          onTap: _pickDeadline,
                          hint: 'Sana va vaqt',
                          controller: TextEditingController(text: _deadline == null ? '' : shortDateTime(_deadline!)),
                          suffix: Icon(Icons.calendar_today_rounded, size: 16, color: WebC.zinc300),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const WebLabel("Byudjet (so'm)"),
                        WebInput(controller: _budget, keyboardType: TextInputType.number),
                      ],
                    ),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: WebC.red, fontSize: 14)),
              ],
              const SizedBox(height: 12),
              WebButton(label: _busy ? '...' : "Buyurtmani e'lon qilish", expand: true, onPressed: _busy ? null : _submit),
            ],
          ),
        ),
      ],
    );
  }
}
