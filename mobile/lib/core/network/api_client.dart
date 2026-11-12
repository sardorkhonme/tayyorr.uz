import 'dart:io';

import 'package:dio/dio.dart';

import '../app_config.dart';
import '../app_info.dart';
import '../constants.dart';
import '../storage/local_storage.dart';
import 'api_exception.dart';

/// Har bir so'rovga avtomatik "Authorization: Bearer TOKEN" qo'shadi
/// (token bo'lsa). tayyorr.uz backendi bilan gaplashadigan yagona joy.
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: kApiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        contentType: 'application/json',
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await LocalStorage.instance.readToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          // server shu raqam bo'yicha eskirgan ilovani aniqlaydi (majburiy yangilanish)
          options.headers['X-App-Build'] = '${AppInfo.build}';
          handler.next(options);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    return _unwrap(() => _dio.get(path, queryParameters: query));
  }

  Future<Map<String, dynamic>> post(String path, {Object? data}) async {
    return _unwrap(() => _dio.post(path, data: data));
  }

  Future<Map<String, dynamic>> delete(String path, {Object? data}) async {
    return _unwrap(() => _dio.delete(path, data: data));
  }

  Future<Map<String, dynamic>> patch(String path, {Object? data}) async {
    return _unwrap(() => _dio.patch(path, data: data));
  }

  Future<Map<String, dynamic>> _unwrap(Future<Response> Function() call) async {
    try {
      final res = await call();
      if (AppConfig.instance.maintenance != null) {
        AppConfig.instance.setMaintenance(null);
      }
      final data = res.data;
      if (data is Map<String, dynamic>) return data;
      return {'data': data};
    } on DioException catch (e) {
      final body = e.response?.data;
      final code = e.response?.statusCode;
      if (code == 426 || (body is Map && body['updateRequired'] == true)) {
        AppConfig.instance.markUpdateRequired();
      } else if (code == 503 && body is Map && body['maintenance'] == true) {
        AppConfig.instance.setMaintenance(
          body['error'] as String? ?? 'Texnik işlar olib borilmoqda',
        );
      }
      final msg = (body is Map && body['error'] is String)
          ? body['error'] as String
          : _fallbackMessage(e);
      throw ApiException(
        msg,
        statusCode: e.response?.statusCode,
        restricted: body is Map && body['restricted'] == true,
        network: e.response == null && _isNetwork(e),
      );
    }
  }

  static bool _isNetwork(DioException e) => switch (e.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.receiveTimeout ||
    DioExceptionType.sendTimeout ||
    DioExceptionType.connectionError => true,
    DioExceptionType.unknown => e.error is SocketException,
    _ => false,
  };

  String _fallbackMessage(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return ApiException.slowMessage;
      case DioExceptionType.connectionError:
        return ApiException.offlineMessage;
      case DioExceptionType.unknown when e.error is SocketException:
        return ApiException.offlineMessage;
      default:
        return 'Nimadir xato ketdi';
    }
  }
}
