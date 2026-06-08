class AppConstants {
  AppConstants._();

  static const String appName = 'EnglishFlow';
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

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
