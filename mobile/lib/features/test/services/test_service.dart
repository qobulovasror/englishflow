import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/features/test/models/quiz_model.dart';

final testServiceProvider = Provider<TestService>((ref) {
  return TestService(ref.watch(dioProvider));
});

class TestService {
  final Dio _dio;

  TestService(this._dio);

  Future<QuizStart> startQuiz() async {
    try {
      final response = await _dio.post(ApiEndpoints.testStart);
      final data = response.data['questions'] as List;
      return QuizStart(
        testId: response.data['testId']?.toString() ?? '',
        questions: data.map((json) => QuizQuestion.fromJson(json)).toList(),
      );
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : ApiException(message: 'Failed to load quiz');
    }
  }

  Future<Map<String, dynamic>> submitQuiz(
    String testId,
    List<QuizAnswer> answers,
  ) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.testSubmit,
        data: {
          'testId': testId,
          'answers': answers.map((a) => a.toJson()).toList(),
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : ApiException(message: 'Failed to submit quiz');
    }
  }
}
