import 'dart:developer' as developer;

import 'package:dio/dio.dart';

/// Logs Dio requests/responses with sensitive fields redacted.
///
/// Fields named `password`, `accessToken`, `refreshToken`, `token`, and
/// `authorization` are replaced with `'[REDACTED]'` so credentials never
/// leak into stdout or `adb logcat`.
class SafeLogInterceptor extends Interceptor {
  static const _sensitiveKeys = <String>{
    'password',
    'newPassword',
    'currentPassword',
    'accessToken',
    'refreshToken',
    'token',
    'authorization',
  };

  static const _sensitiveHeaderKeys = <String>{
    'authorization',
    'cookie',
    'set-cookie',
  };

  final bool logRequestBody;
  final bool logResponseBody;

  SafeLogInterceptor({
    this.logRequestBody = true,
    this.logResponseBody = true,
  });

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final headers = _redactHeaders(options.headers);
    developer.log(
      '→ ${options.method} ${options.uri}'
      '${logRequestBody ? '\n  body: ${_redact(options.data)}' : ''}'
      '\n  headers: $headers',
      name: 'dio',
    );
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final method = response.requestOptions.method;
    final uri = response.requestOptions.uri;
    developer.log(
      '← $method $uri ${response.statusCode}'
      '${logResponseBody ? '\n  body: ${_redact(response.data)}' : ''}',
      name: 'dio',
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final method = err.requestOptions.method;
    final uri = err.requestOptions.uri;
    developer.log(
      '✗ $method $uri ${err.response?.statusCode ?? err.type.name}'
      '\n  ${_redact(err.response?.data) ?? err.message}',
      name: 'dio',
      level: 1000,
    );
    handler.next(err);
  }

  static dynamic _redact(dynamic value) {
    if (value is Map) {
      return value.map((k, v) {
        if (k is String && _sensitiveKeys.contains(k)) {
          return MapEntry(k, '[REDACTED]');
        }
        return MapEntry(k, _redact(v));
      });
    }
    if (value is List) {
      return value.map(_redact).toList();
    }
    return value;
  }

  static Map<String, dynamic> _redactHeaders(Map<String, dynamic> headers) {
    return headers.map((k, v) {
      if (_sensitiveHeaderKeys.contains(k.toLowerCase())) {
        return MapEntry(k, '[REDACTED]');
      }
      return MapEntry(k, v);
    });
  }
}
