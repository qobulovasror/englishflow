import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/features/auth/models/auth_response.dart';
import 'package:englishflow/features/auth/models/login_request.dart';
import 'package:englishflow/features/auth/models/register_request.dart';

// Explicit type annotation: dioProvider -> authServiceProvider -> authProvider
// -> dioProvider form an intentional provider cycle (the network layer signals
// the auth layer on session expiry). Annotating breaks Dart's top-level type
// inference cycle; the providers themselves resolve lazily at runtime.
final Provider<AuthService> authServiceProvider = Provider<AuthService>((ref) {
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

  /// Requests a password-reset email. Always succeeds server-side (200) for
  /// any input, so callers must show a neutral message (no account enumeration).
  Future<void> forgotPassword(String email) async {
    try {
      await _dio.post(
        ApiEndpoints.forgotPassword,
        data: {'email': email},
      );
    } on DioException catch (e) {
      throw _toApiException(e, 'Could not send the reset email');
    }
  }

  /// Completes a password reset with a token from the email. A bad/expired
  /// token returns 400 and is surfaced as an [ApiException].
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      await _dio.post(
        ApiEndpoints.resetPassword,
        data: {'token': token, 'newPassword': newPassword},
      );
    } on DioException catch (e) {
      throw _toApiException(e, 'Could not reset your password');
    }
  }

  /// Asks the server to (re)send the email-verification message to the
  /// authenticated user.
  Future<void> requestEmailVerification() async {
    try {
      await _dio.post(ApiEndpoints.verifyEmailRequest);
    } on DioException catch (e) {
      throw _toApiException(e, 'Could not send the verification email');
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
