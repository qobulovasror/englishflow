import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/features/test/models/test_state.dart';
import 'package:englishflow/features/test/models/quiz_model.dart';
import 'package:englishflow/features/test/services/test_service.dart';
import 'package:englishflow/core/utils/token_storage.dart';
import 'dart:async';
import 'dart:convert';

final testProvider = StateNotifierProvider<TestNotifier, TestState>((ref) {
  return TestNotifier(
    ref.watch(testServiceProvider),
    ref.watch(tokenStorageProvider),
  );
});

class TestNotifier extends StateNotifier<TestState> {
  final TestService _testService;
  final TokenStorage _tokenStorage;
  Future<void> _draftWrites = Future<void>.value();

  TestNotifier(this._testService, this._tokenStorage)
      : super(const TestState());

  Future<void> loadQuiz({String mode = 'FORWARD'}) async {
    final draft = await _tokenStorage.getQuizDraft();
    if (draft != null) {
      try {
        final data = jsonDecode(draft) as Map<String, dynamic>;
        final savedMode = data['mode'] as String? ?? 'FORWARD';
        if (savedMode != mode) {
          await _tokenStorage.clearQuizDraft();
        } else {
          final questions = (data['questions'] as List)
              .map((q) => QuizQuestion.fromJson(Map<String, dynamic>.from(q)))
              .toList();
          final currentIndex = data['currentIndex'] as int;
          final answers = (data['answers'] as List)
              .map((a) => QuizAnswer(
                    wordId: a['wordId'] as String,
                    selectedAnswer: a['selectedAnswer'] as String,
                  ))
              .toList();
          final selectedOption = data['selectedOption'] as int?;
          final typedAnswer = data['typedAnswer'] as String? ?? '';
          if ((data['testId'] as String).isEmpty ||
              questions.isEmpty ||
              currentIndex < 0 ||
              currentIndex >= questions.length ||
              answers.length != currentIndex ||
              questions.any((q) =>
                  q.wordId.isEmpty ||
                  (q.mode != 'LISTENING' && q.word.isEmpty) ||
                  (q.mode == 'TYPED'
                      ? q.options.isNotEmpty
                      : q.options.length < 2) ||
                  q.options.any((o) => o.isEmpty)) ||
              answers.asMap().entries.any((entry) =>
                  entry.value.wordId != questions[entry.key].wordId ||
                  entry.value.selectedAnswer.isEmpty ||
                  (questions[entry.key].mode != 'TYPED' &&
                      !questions[entry.key]
                          .options
                          .contains(entry.value.selectedAnswer))) ||
              (selectedOption != null &&
                  (selectedOption < 0 ||
                      selectedOption >=
                          questions[currentIndex].options.length)) ||
              (questions[currentIndex].mode == 'TYPED' &&
                  selectedOption != null)) {
            throw const FormatException('Invalid saved quiz state');
          }
          state = TestState(
            testId: data['testId'] as String,
            questions: questions,
            currentIndex: currentIndex,
            answers: answers,
            selectedOption: selectedOption,
            typedAnswer: typedAnswer,
            quizMode: savedMode,
          );
          return;
        }
      } catch (_) {
        await _tokenStorage.clearQuizDraft();
      }
    }

    state = state.copyWith(
      isLoading: true,
      clearError: true,
      questions: [],
      currentIndex: 0,
      answers: [],
      clearSelection: true,
      clearScore: true,
      clearTestId: true,
      quizMode: mode,
    );
    try {
      final start = await _testService.startQuiz(mode: mode);
      state = state.copyWith(
        questions: start.questions,
        testId: start.testId,
        quizMode: mode,
        isLoading: false,
      );
      await _persistDraft();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void selectOption(int index) {
    state = state.copyWith(selectedOption: index);
    unawaited(_persistDraft());
  }

  void setTypedAnswer(String value) {
    state = state.copyWith(typedAnswer: value);
    unawaited(_persistDraft());
  }

  void nextQuestion() {
    final question = state.currentQuestion;
    if (question == null ||
        (question.mode == 'TYPED'
            ? state.typedAnswer.trim().isEmpty
            : state.selectedOption == null)) return;

    final answer = QuizAnswer(
      wordId: question.wordId,
      selectedAnswer: question.mode == 'TYPED'
          ? state.typedAnswer.trim()
          : question.options[state.selectedOption!],
    );

    state = state.copyWith(
      answers: [...state.answers, answer],
      currentIndex: state.currentIndex + 1,
      clearSelection: true,
    );
    unawaited(_persistDraft());
  }

  /// Submits all answers to the server and returns the server-graded score, or
  /// `null` when the submission couldn't be completed (nothing to submit, or a
  /// network/server error — the error is set on state). Callers must NOT treat
  /// a failure as a real 0 score.
  ///
  /// The client no longer knows which option is correct — `/tests/start` does
  /// not return `correctAnswer`, so grading is server-only.
  Future<int?> submitQuiz() async {
    if (state.currentQuestion == null ||
        state.testId == null ||
        (state.currentQuestion!.mode == 'TYPED'
            ? state.typedAnswer.trim().isEmpty
            : state.selectedOption == null)) {
      return null;
    }

    final question = state.currentQuestion!;
    final lastAnswer = QuizAnswer(
      wordId: question.wordId,
      selectedAnswer: question.mode == 'TYPED'
          ? state.typedAnswer.trim()
          : question.options[state.selectedOption!],
    );
    // Compute locally — do NOT persist into state.answers before the call.
    // Persisting would make a retry (which re-enters submitQuiz) append the
    // last answer again each time.
    final allAnswers = [...state.answers, lastAnswer];

    state = state.copyWith(isSubmitting: true);

    try {
      final result = await _testService.submitQuiz(state.testId!, allAnswers);
      final raw = result['score'];
      final serverScore = raw is num ? raw.toInt() : 0;
      state = state.copyWith(isSubmitting: false, score: serverScore);
      await _clearDraft();
      return serverScore;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Failed to submit quiz. Check your connection and try again.',
      );
      return null;
    }
  }

  Future<void> reset() async {
    state = const TestState();
    await _clearDraft();
  }

  Future<void> _persistDraft() {
    if (state.testId == null || state.questions.isEmpty) {
      return Future<void>.value();
    }
    final draft = jsonEncode({
      'testId': state.testId,
      'questions': state.questions.map((q) => q.toJson()).toList(),
      'currentIndex': state.currentIndex,
      'answers': state.answers.map((a) => a.toJson()).toList(),
      'selectedOption': state.selectedOption,
      'typedAnswer': state.typedAnswer,
      'mode': state.quizMode,
    });
    _draftWrites = _draftWrites
        .catchError((_) {})
        .then((_) => _tokenStorage.saveQuizDraft(draft));
    return _draftWrites;
  }

  Future<void> _clearDraft() async {
    await _draftWrites.catchError((_) {});
    await _tokenStorage.clearQuizDraft();
  }
}
