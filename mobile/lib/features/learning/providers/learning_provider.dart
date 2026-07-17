import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/features/learning/models/learning_state.dart';
import 'package:englishflow/features/learning/services/learning_service.dart';

final learningProvider =
    StateNotifierProvider<LearningNotifier, LearningState>((ref) {
  return LearningNotifier(ref.watch(learningServiceProvider));
});

class LearningNotifier extends StateNotifier<LearningState> {
  final LearningService _learningService;

  LearningNotifier(this._learningService) : super(const LearningState());

  Future<void> loadDailyWords() async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      currentIndex: 0,
      knownCount: 0,
      unknownCount: 0,
      isCompleted: false,
      isFlipped: false,
    );
    try {
      final words = await _learningService.getDailyWords();
      state = state.copyWith(
        dailyWords: words,
        isLoading: false,
        isCompleted: words.isEmpty,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void flipCard() {
    state = state.copyWith(isFlipped: !state.isFlipped);
  }

  Future<void> markWord(ReviewRating rating) async {
    final currentWord = state.currentWord;
    if (currentWord == null) return;

    // Send the review without blocking the UI, but DON'T silently swallow a
    // failure: count it so the session summary can tell the user their progress
    // wasn't fully saved (instead of pretending every review synced).
    _learningService
        .reviewWord(userWordId: currentWord.id, rating: rating)
        .catchError((_) {
      if (mounted) {
        state = state.copyWith(failedReviews: state.failedReviews + 1);
      }
    });

    // AGAIN is the only "didn't recall" grade; the rest count as known for the
    // session summary.
    final known = rating != ReviewRating.again;
    final nextIndex = state.currentIndex + 1;
    final isCompleted = nextIndex >= state.dailyWords.length;

    state = state.copyWith(
      currentIndex: nextIndex,
      knownCount: known ? state.knownCount + 1 : null,
      unknownCount: !known ? state.unknownCount + 1 : null,
      isFlipped: false,
      isCompleted: isCompleted,
    );
  }

  void reset() {
    state = const LearningState();
  }
}
