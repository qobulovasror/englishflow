import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:englishflow/core/constants/app_constants.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/features/learning/models/daily_word_model.dart';
import 'package:englishflow/core/utils/token_storage.dart';

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
  return LearningService(
      ref.watch(dioProvider), ref.watch(tokenStorageProvider));
});

class LearningService {
  final Dio _dio;
  final TokenStorage _tokenStorage;

  LearningService(this._dio, this._tokenStorage);

  Future<String?> _currentUserKey() async {
    final raw = await _tokenStorage.getUserData();
    if (raw == null) return null;
    try {
      final id = (jsonDecode(raw) as Map<String, dynamic>)['id']?.toString();
      if (id != null && id.isNotEmpty) return id;
    } catch (_) {}
    return null;
  }

  String _cacheKey(String userId, String name) => 'learning:$userId:$name';

  String _newRequestId() {
    final random = Random.secure();
    String hex(int count) =>
        List.generate(count, (_) => random.nextInt(16).toRadixString(16))
            .join();
    return '${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + random.nextInt(4)).toRadixString(16)}${hex(3)}-${hex(12)}';
  }

  Future<List<DailyWordModel>> getDailyWords() async {
    final userId = await _currentUserKey();
    try {
      final response = await _dio.get(
        ApiEndpoints.dailyWords,
        queryParameters: {
          'tzOffsetMinutes': DateTime.now().timeZoneOffset.inMinutes,
        },
      );
      final data = response.data as List;
      final words = data.map((json) => DailyWordModel.fromJson(json)).toList();
      if (userId != null) {
        await Hive.box(AppConstants.cacheBox).put(
          _cacheKey(userId, 'daily'),
          jsonEncode(words.map((word) => word.toJson()).toList()),
        );
      }
      return words;
    } on DioException catch (e) {
      if (userId != null) {
        final cached =
            Hive.box(AppConstants.cacheBox).get(_cacheKey(userId, 'daily'));
        if (cached is String) {
          final rows = jsonDecode(cached) as List<dynamic>;
          if (rows.isNotEmpty) {
            final pending = _decodeQueue(Hive.box(AppConstants.cacheBox)
                    .get(_cacheKey(userId, 'reviews')))
                .map((row) => row['userWordId'])
                .toSet();
            return rows
                .map((row) => DailyWordModel.fromJson(
                    Map<String, dynamic>.from(row as Map)))
                .where((word) => !pending.contains(word.id))
                .toList();
          }
        }
      }
      throw e.error is ApiException
          ? e.error as ApiException
          : ApiException(message: 'Failed to load daily words');
    }
  }

  Future<void> reviewWord({
    required String userWordId,
    required ReviewRating rating,
    required String requestId,
  }) async {
    try {
      await _dio.post(
        ApiEndpoints.review,
        data: {
          'userWordId': userWordId,
          'rating': rating.wireValue,
          'requestId': requestId,
        },
      );
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : ApiException(message: 'Failed to submit review');
    }
  }

  Future<int> queueReview(
      {required String userWordId, required ReviewRating rating}) async {
    final userId = await _currentUserKey();
    if (userId == null) throw StateError('Sign in to save offline reviews.');
    final box = Hive.box(AppConstants.cacheBox);
    final key = _cacheKey(userId, 'reviews');
    final rows = _decodeQueue(box.get(key));
    rows.add({
      'requestId': _newRequestId(),
      'userWordId': userWordId,
      'rating': rating.wireValue
    });
    await box.put(key, jsonEncode(rows));
    final dailyKey = _cacheKey(userId, 'daily');
    final cachedDaily = box.get(dailyKey);
    if (cachedDaily is String) {
      final words = (jsonDecode(cachedDaily) as List<dynamic>)
          .where((row) => row['id'] != userWordId)
          .toList();
      await box.put(dailyKey, jsonEncode(words));
    }
    return rows.length;
  }

  Future<int> syncQueuedReviews() async {
    final userId = await _currentUserKey();
    if (userId == null) return 0;
    final box = Hive.box(AppConstants.cacheBox);
    final key = _cacheKey(userId, 'reviews');
    final rows = _decodeQueue(box.get(key));
    while (rows.isNotEmpty) {
      final row = rows.first;
      final rating = ReviewRating.values
          .firstWhere((value) => value.wireValue == row['rating']);
      try {
        await reviewWord(
            userWordId: row['userWordId'] as String,
            rating: rating,
            requestId: row['requestId'] as String);
        rows.removeAt(0);
        await box.put(key, jsonEncode(rows));
      } on DioException {
        break;
      } on ApiException catch (error) {
        final status = error.statusCode;
        final permanentClientError = status != null &&
            status >= 400 &&
            status < 500 &&
            status != 401 &&
            status != 408 &&
            status != 425 &&
            status != 429;
        if (!permanentClientError) break;
        final rejectedKey = _cacheKey(userId, 'rejected_reviews');
        final rejected = _decodeQueue(box.get(rejectedKey));
        rejected.add({...row, 'error': error.message});
        rows.removeAt(0);
        await box.put(rejectedKey, jsonEncode(rejected));
        await box.put(key, jsonEncode(rows));
      }
    }
    return rows.length;
  }

  Future<int> rejectedReviewCount() async {
    final userId = await _currentUserKey();
    if (userId == null) return 0;
    return _decodeQueue(Hive.box(AppConstants.cacheBox)
            .get(_cacheKey(userId, 'rejected_reviews')))
        .length;
  }

  Future<void> discardRejectedReviews() async {
    final userId = await _currentUserKey();
    if (userId == null) return;
    await Hive.box(AppConstants.cacheBox)
        .delete(_cacheKey(userId, 'rejected_reviews'));
  }

  List<Map<String, dynamic>> _decodeQueue(dynamic value) {
    if (value is! String) return [];
    try {
      return (jsonDecode(value) as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
