import 'package:flutter/foundation.dart';

class AppConstants {
  AppConstants._();

  static const String appName = 'EnglishFlow';

  // Production API (nginx proxies /api → backend). Release builds fall back to
  // this when no BASE_URL is supplied, so a release can never silently ship the
  // cleartext emulator dev URL.
  static const String _prodBaseUrl = 'https://englishflow.mindcore.uz/api';
  // Debug default: Android emulator reaches the host at 10.0.2.2.
  static const String _devBaseUrl = 'http://10.0.2.2:3000';
  // Explicit build-time override: --dart-define=BASE_URL=...
  static const String _envBaseUrl = String.fromEnvironment('BASE_URL');

  /// Effective API base URL. A `--dart-define=BASE_URL=...` always wins;
  /// otherwise production HTTPS in release and the emulator URL in debug.
  static String get baseUrl {
    if (_envBaseUrl.isNotEmpty) return _envBaseUrl;
    return kReleaseMode ? _prodBaseUrl : _devBaseUrl;
  }

  // Storage keys
  static const String tokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String cacheBox = 'englishflow_cache';

  // Pagination
  static const int defaultPageSize = 20;

  // Learning
  static const int dailyWordGoal = 10;
  static const int flashcardBatchSize = 10;

  // Test
  static const int quizOptionsCount = 4;
  static const int quizQuestionsCount = 10;
}
