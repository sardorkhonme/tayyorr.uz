import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import 'smm_models.dart';

/// Tayyorr SMM (smm.tayyorr.uz) API — saytdagi kabi SSO belgisi bilan. Belgini app.tayyorr.uz beradi
/// (/mobile/sso, mobil token evaziga); muddati o'tsa (401) — yangisi olinib, so'rov qaytariladi.
class SmmApi {
  SmmApi._();
  static final instance = SmmApi._();

  static const base = String.fromEnvironment('SMM_URL', defaultValue: 'https://smm.tayyorr.uz');

  final Dio _dio = Dio(BaseOptions(
    baseUrl: '$base/api',
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    contentType: 'application/json',
  ));

  String? _sso;
  SmmCatalog? _catalog;
  DateTime? _catalogAt;

  Future<String> _token({bool fresh = false}) async {
    if (_sso != null && !fresh) return _sso!;
    final r = await ApiClient.instance.get('/mobile/sso');
    final t = r['sso'] as String?;
    if (t == null || t.isEmpty) throw ApiException('Xizmat vaqtinça işlamayapti');
    return _sso = t;
  }

  /// Chiqishda — keyingi foydalanuvchi uchun belgi tozalanadi.
  void reset() {
    _sso = null;
    _catalog = null;
  }

  Future<Map<String, dynamic>> _req(String method, String path, {Object? data, Map<String, dynamic>? query, bool auth = true}) async {
    Future<Response> call(bool fresh) async {
      final headers = <String, String>{};
      if (auth) headers['Cookie'] = 'tyr_sso=${await _token(fresh: fresh)}';
      return _dio.request(path, data: data, queryParameters: query, options: Options(method: method, headers: headers));
    }

    try {
      Response res;
      try {
        res = await call(false);
      } on DioException catch (e) {
        if (auth && e.response?.statusCode == 401) {
          res = await call(true);
        } else {
          rethrow;
        }
      }
      final d = res.data;
      return d is Map<String, dynamic> ? d : {'data': d};
    } on DioException catch (e) {
      final body = e.response?.data;
      final msg = body is Map && body['error'] is String
          ? body['error'] as String
          : (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout
              ? "Internetga ulanib bölmadi"
              : 'Nimadir xato ketdi — qayta urinib köring');
      throw ApiException(msg, statusCode: e.response?.statusCode);
    }
  }

  /// Xizmatlar katalogi — 5 daqiqa keshlanadi (narxlar kurs bo'yicha o'zgarib turadi).
  Future<SmmCatalog> catalog({bool force = false}) async {
    final at = _catalogAt;
    if (!force && _catalog != null && at != null && DateTime.now().difference(at) < const Duration(minutes: 5)) {
      return _catalog!;
    }
    final r = await _req('GET', '/m/catalog', auth: false);
    _catalogAt = DateTime.now();
    return _catalog = SmmCatalog.fromJson(r);
  }

  /// Havolani tekshirish ("Yuboriladi: …" yoki xato matni).
  Future<({bool ok, String text})> checkLink(String serviceId, String link) async {
    final r = await _req('GET', '/m/link', query: {'serviceId': serviceId, 'link': link}, auth: false);
    return r['ok'] == true ? (ok: true, text: '${r['url']}') : (ok: false, text: '${r['error'] ?? ''}');
  }

  /// Buyurtma berish — qaytaradi: yangi balans.
  Future<int?> placeOrder(String serviceId, String link, int quantity) async {
    final r = await _req('POST', '/orders', data: {'serviceId': serviceId, 'link': link, 'quantity': quantity});
    return (r['balance'] as num?)?.toInt();
  }

  Future<SmmOrdersData> orders() async => SmmOrdersData.fromJson(await _req('GET', '/m/orders'));

  Future<SmmOrderDetail> order(String id) async => SmmOrderDetail.fromJson(await _req('GET', '/m/orders/$id'));

  /// Provayderdan holatni hozir so'rash (10 soniyada ko'pi bilan bir marta).
  Future<void> refresh(String id) async => _req('POST', '/orders/$id/refresh');

  Future<SmmGuide> guide() async => SmmGuide.fromJson(await _req('GET', '/m/guide', auth: false));
}
