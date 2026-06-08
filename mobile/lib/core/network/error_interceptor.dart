import 'package:dio/dio.dart';
import 'package:englishflow/core/network/api_exception.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final apiException = ApiException.fromDioException(err);
    handler.next(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: apiException,
        message: apiException.message,
      ),
    );
  }
}
