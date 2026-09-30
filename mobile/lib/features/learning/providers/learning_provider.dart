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
      final pendingReviews = await _learningService.syncQueuedReviews();
      final rejectedReviews = await _learningService.rejectedReviewCount();
      final words = await _learningService.getDailyWords();
      state = state.copyWith(
        dailyWords: words,
        isLoading: false,
        isCompleted: words.isEmpty,
        failedReviews: pendingReviews,
        rejectedReviews: rejectedReviews,
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

    // Persist the event locally before advancing so offline answers survive
    // process death. Each event keeps one idempotency key through every retry.
    try {
      final pending = await _learningService.queueReview(
        userWordId: currentWord.id,
        rating: rating,
      );
      if (mounted) state = state.copyWith(failedReviews: pending);
      final stillPending = await _learningService.syncQueuedReviews();
      final rejected = await _learningService.rejectedReviewCount();
      if (mounted) {
        state = state.copyWith(
          failedReviews: stillPending,
          rejectedReviews: rejected,
        );
      }
    } catch (error) {
      if (mounted) {
        state = state.copyWith(
            error: 'Javob saqlanmadi. Qayta urinib ko‘ring: $error');
      }
      return;
    }

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

  Future<void> discardRejectedReviews() async {
    await _learningService.discardRejectedReviews();
    if (mounted) state = state.copyWith(rejectedReviews: 0);
  }
}
