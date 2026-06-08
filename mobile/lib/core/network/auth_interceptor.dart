import 'package:dio/dio.dart';
import 'package:englishflow/core/utils/token_storage.dart';

/// Attaches the access token to outgoing requests. Token clearing on 401 is
/// owned by `RefreshInterceptor`, which gets the first chance to rotate
/// the token before declaring the session dead.
class AuthInterceptor extends Interceptor {
  final TokenStorage tokenStorage;

  AuthInterceptor({required this.tokenStorage});

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenStorage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
