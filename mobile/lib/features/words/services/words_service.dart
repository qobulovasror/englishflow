import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/paginated_response.dart';
import 'package:englishflow/features/words/models/word_model.dart';

final wordsServiceProvider = Provider<WordsService>((ref) {
  return WordsService(ref.watch(dioProvider));
});

class WordsService {
  final Dio _dio;

  WordsService(this._dio);

  Future<PaginatedResponse<WordModel>> getWordsPage({
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.words,
        queryParameters: {'page': page, 'limit': limit},
      );
      return PaginatedResponse<WordModel>.fromJson(
        response.data as Map<String, dynamic>,
        WordModel.fromJson,
      );
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load words');
    }
  }

  /// Convenience wrapper that returns just the items of the first page.
  /// Backend caps `limit` at 100, so this exposes up to 100 words today.
  Future<List<WordModel>> getWords() async {
    final page = await getWordsPage();
    return page.items;
  }

  Future<WordModel> addWord({
    required String word,
    required String translation,
    String? example,
  }) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.words,
        data: {
          'word': word,
          'translation': translation,
          if (example != null && example.isNotEmpty) 'example': example,
        },
      );
      return WordModel.fromJson(response.data);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to add word');
    }
  }

  Future<void> deleteWord(String id) async {
    try {
      await _dio.delete(ApiEndpoints.wordById(id));
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to delete word');
    }
  }

  ApiException _toApiException(DioException e, String fallback) {
    if (e.error is ApiException) return e.error as ApiException;
    return ApiException(message: fallback);
  }
}
