import 'package:equatable/equatable.dart';
import 'daily_word_model.dart';

class LearningState extends Equatable {
  final List<DailyWordModel> dailyWords;
  final int currentIndex;
  final bool isLoading;
  final String? error;
  final bool isFlipped;
  final int knownCount;
  final int unknownCount;
  final bool isCompleted;
  // Reviews that failed to reach the server (offline / error). Surfaced in the
  // session summary so the user knows their progress wasn't fully saved.
  final int failedReviews;

  const LearningState({
    this.dailyWords = const [],
    this.currentIndex = 0,
    this.isLoading = false,
    this.error,
    this.isFlipped = false,
    this.knownCount = 0,
    this.unknownCount = 0,
    this.isCompleted = false,
    this.failedReviews = 0,
  });

  DailyWordModel? get currentWord =>
      currentIndex < dailyWords.length ? dailyWords[currentIndex] : null;

  int get totalWords => dailyWords.length;
  double get progressPercent =>
      totalWords > 0 ? (currentIndex / totalWords) : 0;

  LearningState copyWith({
    List<DailyWordModel>? dailyWords,
    int? currentIndex,
    bool? isLoading,
    String? error,
    bool? isFlipped,
    int? knownCount,
    int? unknownCount,
    bool? isCompleted,
    int? failedReviews,
    bool clearError = false,
  }) {
    return LearningState(
      dailyWords: dailyWords ?? this.dailyWords,
      currentIndex: currentIndex ?? this.currentIndex,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      isFlipped: isFlipped ?? this.isFlipped,
      knownCount: knownCount ?? this.knownCount,
      unknownCount: unknownCount ?? this.unknownCount,
      isCompleted: isCompleted ?? this.isCompleted,
      failedReviews: failedReviews ?? this.failedReviews,
    );
  }

  @override
  List<Object?> get props => [
        dailyWords,
        currentIndex,
        isLoading,
        error,
        isFlipped,
        knownCount,
        unknownCount,
        isCompleted,
        failedReviews,
      ];
}
