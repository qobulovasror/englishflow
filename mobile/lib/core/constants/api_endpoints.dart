class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';

  // Users
  static const String me = '/users/me';
  static const String onboarding = '/users/me/onboarding';
  static const String changePassword = '/users/me/password';

  // Decks
  static const String decks = '/decks';
  static String deckById(String id) => '/decks/$id';
  static String deckEnroll(String id) => '/decks/$id/enroll';

  // Words
  static const String words = '/words';
  static String wordById(String id) => '/words/$id';

  // Learning
  static const String dailyWords = '/learning/daily';
  static const String review = '/learning/review';

  // Tests
  static const String testStart = '/tests/start';
  static const String testSubmit = '/tests/submit';

  // Progress
  static const String progress = '/progress';
}
