import 'package:dio/dio.dart';

/// Unwraps the backend's success envelope so service code can read
/// `response.data` directly without knowing about the wrapper shape.
///
/// Backend success: `{ "success": true, "data": <T>, "timestamp": "..." }`
/// Backend error:   `{ "success": false, "statusCode": ..., "message": ..., ... }`
///
/// On success responses we mutate `response.data` to be the inner payload.
/// Error responses go through Dio's onError path and are handled by
/// [ErrorInterceptor] / [ApiException].
class ResponseUnwrapInterceptor extends Interceptor {
  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final body = response.data;
    if (body is Map<String, dynamic> &&
        body['success'] == true &&
        body.containsKey('data')) {
      response.data = body['data'];
    }
    handler.next(response);
  }
}
