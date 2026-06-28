import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/features/progress/models/progress_model.dart';

final progressServiceProvider = Provider<ProgressService>((ref) {
  return ProgressService(ref.watch(dioProvider));
});

class ProgressService {
  final Dio _dio;

  ProgressService(this._dio);

  Future<ProgressStats> getProgress() async {
    try {
      final response = await _dio.get(ApiEndpoints.progress);
      return ProgressStats.fromJson(response.data);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load progress');
    }
  }

  /// Dense daily review counts (oldest→newest) for the last [days] days.
  Future<List<TrendPoint>> getTrends({int days = 30}) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.progressTrends,
        queryParameters: {'days': days},
      );
      final items = (response.data as List? ?? const []);
      return items
          .map((json) => TrendPoint.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load review trend');
    }
  }

  Future<List<DeckProgress>> getDeckProgress() async {
    try {
      final response = await _dio.get(ApiEndpoints.progressDecks);
      final items = (response.data as List? ?? const []);
      return items
          .map((json) => DeckProgress.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load deck progress');
    }
  }

  Future<List<Leech>> getLeeches() async {
    try {
      final response = await _dio.get(ApiEndpoints.progressLeeches);
      final items = (response.data as List? ?? const []);
      return items
          .map((json) => Leech.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load words to review');
    }
  }

  ApiException _toApiException(DioException e, String fallback) {
    if (e.error is ApiException) return e.error as ApiException;
    return ApiException(message: fallback);
  }
}
