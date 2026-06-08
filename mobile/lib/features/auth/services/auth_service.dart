import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/features/auth/models/auth_response.dart';
import 'package:englishflow/features/auth/models/login_request.dart';
import 'package:englishflow/features/auth/models/register_request.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(dioProvider));
});

/// Header marker that tells [RefreshInterceptor] not to attempt a token
/// refresh for this request — used by the refresh/logout calls themselves.
const String kSkipRefreshHeader = 'X-Skip-Auth-Refresh';

class AuthService {
  final Dio _dio;

  AuthService(this._dio);

  Future<AuthResponse> login(LoginRequest request) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.login,
        data: request.toJson(),
      );
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _toApiException(e, 'Login failed');
    }
  }

  Future<AuthResponse> register(RegisterRequest request) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.register,
        data: request.toJson(),
      );
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _toApiException(e, 'Registration failed');
    }
  }

  Future<AuthResponse> refresh(String refreshToken) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
        options: Options(headers: {kSkipRefreshHeader: '1'}),
      );
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw _toApiException(e, 'Session expired — please log in again');
    }
  }

  Future<void> logout(String refreshToken) async {
    try {
      await _dio.post(
        ApiEndpoints.logout,
        data: {'refreshToken': refreshToken},
        options: Options(headers: {kSkipRefreshHeader: '1'}),
      );
    } on DioException catch (_) {
      // Best-effort revocation — never block the user's logout on a network
      // or server error.
    }
  }

  ApiException _toApiException(DioException e, String fallback) {
    if (e.error is ApiException) return e.error as ApiException;
    return ApiException(message: fallback);
  }
}
