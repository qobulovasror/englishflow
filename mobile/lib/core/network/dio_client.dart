import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/app_constants.dart';
import 'package:englishflow/core/network/auth_interceptor.dart';
import 'package:englishflow/core/network/error_interceptor.dart';
import 'package:englishflow/core/network/refresh_interceptor.dart';
import 'package:englishflow/core/network/response_unwrap_interceptor.dart';
import 'package:englishflow/core/network/safe_log_interceptor.dart';
import 'package:englishflow/core/utils/token_storage.dart';
import 'package:englishflow/features/auth/providers/auth_provider.dart';

// Explicit type annotation breaks the top-level inference cycle created by the
// session-expiry callback below (dioProvider -> authProvider -> ... -> dioProvider).
final Provider<Dio> dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  final tokenStorage = ref.watch(tokenStorageProvider);

  // Order matters:
  // - AuthInterceptor attaches the Bearer token on every request.
  // - ResponseUnwrapInterceptor strips the success envelope before services
  //   read `response.data`.
  // - RefreshInterceptor sits in front of ErrorInterceptor so it can rescue
  //   401s by silently rotating the token; if refresh itself fails it falls
  //   through to ErrorInterceptor for normalization.
  // - ErrorInterceptor turns DioException into ApiException.
  // - SafeLogInterceptor only runs in debug builds and redacts secrets.
  dio.interceptors.addAll([
    AuthInterceptor(tokenStorage: tokenStorage),
    ResponseUnwrapInterceptor(),
    RefreshInterceptor(
      dio: dio,
      tokenStorage: tokenStorage,
      // Read (not watch) at call time — avoids a build-time cycle since
      // authProvider transitively depends on this dio provider.
      onSessionExpired: () => ref.read(authProvider.notifier).onSessionExpired(),
    ),
    ErrorInterceptor(),
    if (kDebugMode) SafeLogInterceptor(),
  ]);

  return dio;
});
