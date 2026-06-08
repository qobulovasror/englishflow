import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/core/network/api_exception.dart';

DioException _badResponse(dynamic body, {int status = 400}) {
  final options = RequestOptions(path: '/x');
  return DioException(
    requestOptions: options,
    type: DioExceptionType.badResponse,
    response: Response(
      requestOptions: options,
      statusCode: status,
      data: body,
    ),
  );
}

void main() {
  group('ApiException.fromDioException — badResponse', () {
    test('extracts validation errors into fieldErrors', () {
      final e = ApiException.fromDioException(_badResponse({
        'success': false,
        'statusCode': 400,
        'message': 'Validation failed',
        'error': 'Bad Request',
        'errors': [
          'email must be an email',
          'password must be longer than 6 characters',
        ],
      }));

      expect(e.isValidationError, isTrue);
      expect(e.fieldErrors, hasLength(2));
      expect(e.message, contains('email must be an email'));
      expect(e.statusCode, 400);
    });

    test('uses message when no errors array is present', () {
      final e = ApiException.fromDioException(_badResponse(
        {
          'success': false,
          'statusCode': 409,
          'message': 'Email already in use',
          'error': 'Conflict',
        },
        status: 409,
      ));

      expect(e.message, 'Email already in use');
      expect(e.isConflict, isTrue);
      expect(e.isValidationError, isFalse);
    });

    test('flags 401 as unauthorized', () {
      final e = ApiException.fromDioException(_badResponse(
        {'message': 'Current password is incorrect'},
        status: 401,
      ));
      expect(e.isUnauthorized, isTrue);
    });

    test('flags 5xx as server error', () {
      final e = ApiException.fromDioException(_badResponse(
        {'message': 'Internal server error'},
        status: 500,
      ));
      expect(e.isServerError, isTrue);
    });

    test('handles legacy NestJS validation pipe message array', () {
      final e = ApiException.fromDioException(_badResponse({
        'statusCode': 400,
        'message': ['field a invalid', 'field b invalid'],
      }));
      expect(e.message, contains('field a invalid'));
      expect(e.message, contains('field b invalid'));
    });

    test('falls back when body is not a Map', () {
      final e = ApiException.fromDioException(_badResponse('<html>'));
      expect(e.message, contains('400'));
      expect(e.statusCode, 400);
    });
  });

  test('connection timeout maps to friendly message', () {
    final e = ApiException.fromDioException(DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.connectionTimeout,
    ));
    expect(e.message, contains('timed out'));
  });

  test('connection error maps to "no internet"', () {
    final e = ApiException.fromDioException(DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.connectionError,
    ));
    expect(e.message, contains('internet'));
  });
}
