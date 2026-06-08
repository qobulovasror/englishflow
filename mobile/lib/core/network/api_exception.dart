import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? error;
  final List<String> fieldErrors;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.error,
    this.fieldErrors = const [],
    this.data,
  });

  bool get isValidationError => fieldErrors.isNotEmpty;
  bool get isUnauthorized => statusCode == 401;
  bool get isConflict => statusCode == 409;
  bool get isServerError => (statusCode ?? 0) >= 500;

  factory ApiException.fromDioException(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          message: 'Connection timed out. Please try again.',
          statusCode: error.response?.statusCode,
        );
      case DioExceptionType.badResponse:
        return _handleBadResponse(error.response);
      case DioExceptionType.connectionError:
        return ApiException(
          message: 'No internet connection. Please check your network.',
        );
      case DioExceptionType.cancel:
        return ApiException(message: 'Request was cancelled');
      default:
        return ApiException(
          message: 'Something went wrong. Please try again.',
        );
    }
  }

  static ApiException _handleBadResponse(Response? response) {
    final data = response?.data;
    final statusCode = response?.statusCode;

    if (data is! Map<String, dynamic>) {
      return ApiException(
        message: 'Request failed (${statusCode ?? 'unknown'})',
        statusCode: statusCode,
        data: data,
      );
    }

    final fieldErrors = _extractFieldErrors(data['errors']);
    final baseMessage = _extractMessage(data, fieldErrors);

    return ApiException(
      message: baseMessage,
      statusCode: statusCode,
      error: data['error']?.toString(),
      fieldErrors: fieldErrors,
      data: data,
    );
  }

  static List<String> _extractFieldErrors(dynamic raw) {
    if (raw is List) {
      return raw.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
    }
    return const [];
  }

  static String _extractMessage(
    Map<String, dynamic> data,
    List<String> fieldErrors,
  ) {
    if (fieldErrors.isNotEmpty) {
      return fieldErrors.join(', ');
    }

    final raw = data['message'];
    if (raw is String && raw.isNotEmpty) return raw;
    if (raw is List && raw.isNotEmpty) {
      return raw.map((e) => e.toString()).join(', ');
    }
    final err = data['error'];
    if (err is String && err.isNotEmpty) return err;
    return 'Something went wrong';
  }

  @override
  String toString() => message;
}
