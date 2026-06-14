import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/features/learning/models/daily_word_model.dart';

/// SM-2 recall grade sent with each review. AGAIN = failed (re-learn), the rest
/// are successful recalls of increasing confidence. The wire value is the
/// uppercase name expected by the backend's Rating enum.
enum ReviewRating {
  again,
  hard,
  good,
  easy;

  String get wireValue => name.toUpperCase();
}

final learningServiceProvider = Provider<LearningService>((ref) {
  return LearningService(ref.watch(dioProvider));
});

class LearningService {
  final Dio _dio;

  LearningService(this._dio);

  Future<List<DailyWordModel>> getDailyWords() async {
    try {
      final response = await _dio.get(ApiEndpoints.dailyWords);
      final data = response.data as List;
      return data.map((json) => DailyWordModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : ApiException(message: 'Failed to load daily words');
    }
  }

  Future<void> reviewWord({
    required String userWordId,
    required ReviewRating rating,
  }) async {
    try {
      await _dio.post(
        ApiEndpoints.review,
        data: {
          'userWordId': userWordId,
          'rating': rating.wireValue,
        },
      );
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : ApiException(message: 'Failed to submit review');
    }
  }
}
