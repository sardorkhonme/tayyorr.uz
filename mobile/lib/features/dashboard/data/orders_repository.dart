import '../../../core/network/api_client.dart';
import 'order_model.dart';

class OrdersRepository {
  final _api = ApiClient.instance;

  /// [scope]: `feed` — ochiq buyurtmalar (buyurtmaçiga — boşqalarniki, faqat körish uçun),
  /// `mine` — buyurtmaçining öz buyurtmalari. Tayyorlovçi uçun server scope'ni e'tiborsiz qoldiradi.
  Future<List<OrderModel>> fetchOrders({String? scope}) async {
    final res = await _api.get(
      scope == null ? '/mobile/orders' : '/mobile/orders?scope=$scope',
    );
    final list = (res['orders'] as List).cast<Map<String, dynamic>>();
    return list.map(OrderModel.fromJson).toList();
  }

  /// Yangi buyurtma id'sini qaytaradi.
  Future<String> createOrder({
    required String title,
    required String type,
    required String description,
    int? budget,
    DateTime? deadline,
  }) async {
    final res = await _api.post(
      '/mobile/orders',
      data: {
        'title': title,
        'type': type,
        'description': description,
        if (budget != null) 'budget': budget,
        if (deadline != null) 'deadline': deadline.toUtc().toIso8601String(),
      },
    );
    return (res['order'] as Map<String, dynamic>)['id'] as String;
  }
}
