import 'package:equatable/equatable.dart';
import 'quiz_model.dart';

class TestState extends Equatable {
  final List<QuizQuestion> questions;
  // Server-issued id for the in-progress test; sent back on submit so the
  // server grades against the exact challenge it persisted.
  final String? testId;
  final int currentIndex;
  final List<QuizAnswer> answers;
  final bool isLoading;
  final String? error;
  final int? selectedOption;
  final bool isSubmitting;
  // Server-graded score, populated after submitQuiz. Null while the quiz is
  // still in progress — the client can no longer know which option is correct.
  final int? score;

  const TestState({
    this.questions = const [],
    this.testId,
    this.currentIndex = 0,
    this.answers = const [],
    this.isLoading = false,
    this.error,
    this.selectedOption,
    this.isSubmitting = false,
    this.score,
  });

  QuizQuestion? get currentQuestion =>
      currentIndex < questions.length ? questions[currentIndex] : null;

  int get totalQuestions => questions.length;
  bool get isLastQuestion => currentIndex >= questions.length - 1;
  double get progressPercent =>
      totalQuestions > 0 ? (currentIndex / totalQuestions) : 0;

  TestState copyWith({
    List<QuizQuestion>? questions,
    String? testId,
    int? currentIndex,
    List<QuizAnswer>? answers,
    bool? isLoading,
    String? error,
    int? selectedOption,
    bool? isSubmitting,
    int? score,
    bool clearError = false,
    bool clearSelection = false,
    bool clearScore = false,
    bool clearTestId = false,
  }) {
    return TestState(
      questions: questions ?? this.questions,
      testId: clearTestId ? null : (testId ?? this.testId),
      currentIndex: currentIndex ?? this.currentIndex,
      answers: answers ?? this.answers,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      selectedOption:
          clearSelection ? null : (selectedOption ?? this.selectedOption),
      isSubmitting: isSubmitting ?? this.isSubmitting,
      score: clearScore ? null : (score ?? this.score),
    );
  }

  @override
  List<Object?> get props => [
        questions,
        testId,
        currentIndex,
        answers,
        isLoading,
        error,
        selectedOption,
        isSubmitting,
        score,
      ];
}
