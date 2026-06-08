import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/features/test/models/test_state.dart';
import 'package:englishflow/features/test/models/quiz_model.dart';
import 'package:englishflow/features/test/services/test_service.dart';

final testProvider = StateNotifierProvider<TestNotifier, TestState>((ref) {
  return TestNotifier(ref.watch(testServiceProvider));
});

class TestNotifier extends StateNotifier<TestState> {
  final TestService _testService;

  TestNotifier(this._testService) : super(const TestState());

  Future<void> loadQuiz() async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      currentIndex: 0,
      answers: [],
      clearSelection: true,
      clearScore: true,
    );
    try {
      final questions = await _testService.startQuiz();
      state = state.copyWith(questions: questions, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void selectOption(int index) {
    state = state.copyWith(selectedOption: index);
  }

  void nextQuestion() {
    if (state.selectedOption == null || state.currentQuestion == null) return;

    final question = state.currentQuestion!;
    final answer = QuizAnswer(
      wordId: question.wordId,
      selectedAnswer: question.options[state.selectedOption!],
    );

    state = state.copyWith(
      answers: [...state.answers, answer],
      currentIndex: state.currentIndex + 1,
      clearSelection: true,
    );
  }

  /// Submits all answers to the server and returns the server-graded score.
  /// The client no longer knows which option is correct — `/tests/start` does
  /// not return `correctAnswer`, so grading is server-only.
  Future<int> submitQuiz() async {
    if (state.selectedOption == null || state.currentQuestion == null) {
      return state.score ?? 0;
    }

    final question = state.currentQuestion!;
    final lastAnswer = QuizAnswer(
      wordId: question.wordId,
      selectedAnswer: question.options[state.selectedOption!],
    );
    final allAnswers = [...state.answers, lastAnswer];

    state = state.copyWith(isSubmitting: true, answers: allAnswers);

    try {
      final result = await _testService.submitQuiz(allAnswers);
      final raw = result['score'];
      final serverScore = raw is num ? raw.toInt() : 0;
      state = state.copyWith(isSubmitting: false, score: serverScore);
      return serverScore;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Failed to submit quiz',
      );
      return 0;
    }
  }

  void reset() {
    state = const TestState();
  }
}
