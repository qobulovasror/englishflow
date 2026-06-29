import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';

final decksServiceProvider = Provider<DecksService>((ref) {
  return DecksService(ref.watch(dioProvider));
});

class DecksService {
  final Dio _dio;

  DecksService(this._dio);

  Future<List<DeckModel>> list({String? level, String? search}) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.decks,
        queryParameters: {
          'limit': 100,
          if (level != null) 'level': level,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      // The response is the paginated envelope's data: { items, total, ... }.
      final items = (response.data['items'] as List? ?? const []);
      return items
          .map((json) => DeckModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load decks');
    }
  }

  Future<int> enroll(String id) async {
    try {
      final response = await _dio.post(ApiEndpoints.deckEnroll(id));
      return (response.data['enrolledCount'] as num?)?.toInt() ?? 0;
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to join deck');
    }
  }

  /// Decks the user created or joined (`GET /decks/mine`).
  Future<List<DeckModel>> getMyDecks() async {
    try {
      final response = await _dio.get(ApiEndpoints.decksMine);
      final items = (response.data as List? ?? const []);
      return items
          .map((json) => DeckModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load your decks');
    }
  }

  /// A single deck with its `words` populated (`GET /decks/:id`).
  Future<DeckModel> getDeck(String id) async {
    try {
      final response = await _dio.get(ApiEndpoints.deckById(id));
      return DeckModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load deck');
    }
  }

  Future<DeckModel> createDeck({
    required String title,
    String? description,
    String? level,
    bool? isPublic,
  }) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.decks,
        data: {
          'title': title,
          if (description != null && description.isNotEmpty)
            'description': description,
          if (level != null && level.isNotEmpty) 'level': level,
          if (isPublic != null) 'isPublic': isPublic,
        },
      );
      return DeckModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to create deck');
    }
  }

  Future<DeckModel> updateDeck(
    String id, {
    String? title,
    String? description,
    String? level,
    bool? isPublic,
  }) async {
    try {
      final response = await _dio.patch(
        ApiEndpoints.deckById(id),
        data: {
          if (title != null) 'title': title,
          if (description != null) 'description': description,
          if (level != null) 'level': level,
          if (isPublic != null) 'isPublic': isPublic,
        },
      );
      return DeckModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to update deck');
    }
  }

  Future<void> deleteDeck(String id) async {
    try {
      await _dio.delete(ApiEndpoints.deckById(id));
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to delete deck');
    }
  }

  /// Adds one or more words to a deck. Each entry is
  /// `{ word, translation, example? }`. Returns the new total word count.
  Future<int> addWordsToDeck(
    String id,
    List<Map<String, String>> words,
  ) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.deckWords(id),
        data: {'words': words},
      );
      return (response.data['wordCount'] as num?)?.toInt() ?? 0;
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to add words');
    }
  }

  Future<void> removeWordFromDeck(String id, String wordId) async {
    try {
      await _dio.delete(ApiEndpoints.deckWordById(id, wordId));
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to remove word');
    }
  }

  ApiException _toApiException(DioException e, String fallback) {
    if (e.error is ApiException) return e.error as ApiException;
    return ApiException(message: fallback);
  }
}
