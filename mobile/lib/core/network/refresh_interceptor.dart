import 'package:dio/dio.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/utils/token_storage.dart';
import 'package:englishflow/features/auth/services/auth_service.dart';

/// Catches 401 responses, attempts to rotate the refresh token, and replays
/// the original request with the new access token.
///
/// Coalesces concurrent 401s so we never fire more than one /auth/refresh in
/// flight. If refresh fails, the local session is cleared and the original
/// 401 is forwarded to the caller (typically the screen shows a login redirect).
class RefreshInterceptor extends Interceptor {
  final Dio dio;
  final TokenStorage tokenStorage;

  /// Invoked when the session can't be recovered (refresh token missing,
  /// rejected, or expired). Lets the app layer clear its in-memory auth state
  /// so the router redirects to /login — clearing storage alone leaves the
  /// StateNotifier believing the user is still authenticated (dead-session
  /// lockout).
  final void Function()? onSessionExpired;

  Future<String?>? _inFlight;

  RefreshInterceptor({
    required this.dio,
    required this.tokenStorage,
    this.onSessionExpired,
  });

  Future<void> _expireSession() async {
    await tokenStorage.clearAll();
    onSessionExpired?.call();
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final response = err.response;
    final options = err.requestOptions;

    final shouldTry =
        response?.statusCode == 401 &&
        options.headers[kSkipRefreshHeader] != '1' &&
        options.extra['__retried'] != true;

    if (!shouldTry) {
      if (response?.statusCode == 401) {
        await _expireSession();
      }
      return handler.next(err);
    }

    // Coalesce concurrent 401s onto a single in-flight refresh. Each awaiter
    // must clear ONLY the future it started — nulling unconditionally lets a
    // late awaiter wipe a newer refresh, spawning a second concurrent
    // /auth/refresh that replays an already-rotated token and (with server-side
    // reuse detection) revokes the whole session family.
    final future = _inFlight ??= _refresh();
    final newAccess = await future;
    if (identical(_inFlight, future)) {
      _inFlight = null;
    }

    if (newAccess == null) {
      await _expireSession();
      return handler.next(err);
    }

    // Retry the original request with the fresh token. Use a one-shot Dio call
    // to avoid re-entering this interceptor's chain on the retried request.
    options.headers['Authorization'] = 'Bearer $newAccess';
    options.extra['__retried'] = true;
    try {
      final retried = await dio.fetch(options);
      return handler.resolve(retried);
    } on DioException catch (retryErr) {
      return handler.next(retryErr);
    }
  }

  Future<String?> _refresh() async {
    final refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken == null) return null;

    try {
      // Use a bare Dio instance to bypass this interceptor entirely. Copy the
      // timeouts so a hung /auth/refresh can't block every coalesced 401 caller
      // indefinitely.
      final bare = Dio(BaseOptions(
        baseUrl: dio.options.baseUrl,
        connectTimeout: dio.options.connectTimeout,
        receiveTimeout: dio.options.receiveTimeout,
      ));
      final res = await bare.post(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            kSkipRefreshHeader: '1',
          },
        ),
      );

      // Response is wrapped by ResponseUnwrapInterceptor on the main dio, but
      // we use a bare Dio here, so we get the raw envelope. Read `data.data`.
      final raw = res.data;
      Map<String, dynamic> payload;
      if (raw is Map && raw['data'] is Map<String, dynamic>) {
        payload = raw['data'] as Map<String, dynamic>;
      } else {
        payload = raw as Map<String, dynamic>;
      }

      final accessToken = payload['accessToken'] as String?;
      final newRefreshToken = payload['refreshToken'] as String?;
      if (accessToken == null || newRefreshToken == null) return null;

      await tokenStorage.saveToken(accessToken);
      await tokenStorage.saveRefreshToken(newRefreshToken);
      return accessToken;
    } on DioException {
      return null;
    }
  }
}
