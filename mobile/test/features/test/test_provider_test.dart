import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/core/utils/token_storage.dart';
import 'package:englishflow/features/test/models/quiz_model.dart';
import 'package:englishflow/features/test/providers/test_provider.dart';
import 'package:englishflow/features/test/services/test_service.dart';

class MemoryTokenStorage extends TokenStorage {
  String? draft;

  @override
  Future<String?> getQuizDraft() async => draft;

  @override
  Future<void> saveQuizDraft(String value) async => draft = value;

  @override
  Future<void> clearQuizDraft() async => draft = null;
}

class FakeTestService implements TestService {
  int startCalls = 0;
  final List<String> startModes = [];
  bool failSubmit = false;

  @override
  Future<QuizStart> startQuiz({String mode = 'FORWARD'}) async {
    startCalls++;
    startModes.add(mode);
    return const QuizStart(
      testId: 'test-1',
      questions: [
        QuizQuestion(wordId: 'w1', word: 'apple', options: ['olma', 'anor']),
        QuizQuestion(wordId: 'w2', word: 'book', options: ['kitob', 'qalam']),
      ],
    );
  }

  @override
  Future<Map<String, dynamic>> submitQuiz(
    String testId,
    List<QuizAnswer> answers,
  ) async {
    if (failSubmit) throw Exception('network error');
    return {'score': 1};
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  late MemoryTokenStorage storage;
  late FakeTestService service;

  setUp(() {
    storage = MemoryTokenStorage();
    service = FakeTestService();
  });

  test('restores the current question and answers after a new notifier starts',
      () async {
    final first = TestNotifier(service, storage);
    await first.loadQuiz();
    first.selectOption(0);
    first.nextQuestion();
    await Future<void>.delayed(const Duration(milliseconds: 10));

    final resumed = TestNotifier(service, storage);
    await resumed.loadQuiz();

    expect(resumed.state.testId, 'test-1');
    expect(resumed.state.currentIndex, 1);
    expect(resumed.state.answers.single.selectedAnswer, 'olma');
    expect(resumed.state.currentQuestion?.word, 'book');
    expect(service.startCalls, 1);
  });

  test('starts the newly selected quiz mode instead of restoring another mode',
      () async {
    final first = TestNotifier(service, storage);
    await first.loadQuiz(mode: 'FORWARD');
    await Future<void>.delayed(const Duration(milliseconds: 10));

    final switched = TestNotifier(service, storage);
    await switched.loadQuiz(mode: 'REVERSE');

    expect(service.startCalls, 2);
    expect(service.startModes, ['FORWARD', 'REVERSE']);
    expect(switched.state.quizMode, 'REVERSE');
    expect(switched.state.testId, 'test-1');
  });

  test('keeps the saved quiz when submission fails and clears it on success',
      () async {
    final notifier = TestNotifier(service, storage);
    await notifier.loadQuiz();
    notifier.selectOption(0);
    service.failSubmit = true;

    expect(await notifier.submitQuiz(), isNull);
    expect(storage.draft, isNotNull);

    service.failSubmit = false;
    expect(await notifier.submitQuiz(), 1);
    expect(storage.draft, isNull);
  });

  test('saved draft contains no answer key and remains valid JSON', () async {
    final notifier = TestNotifier(service, storage);
    await notifier.loadQuiz();

    final draft = jsonDecode(storage.draft!) as Map<String, dynamic>;
    expect(draft['testId'], 'test-1');
    expect(draft['questions'], isA<List>());
    expect(storage.draft, isNot(contains('correctAnswer')));
  });

  test('discards a malformed draft and requests a fresh quiz', () async {
    storage.draft = jsonEncode({
      'testId': 'broken',
      'questions': [
        {
          'wordId': 'w1',
          'word': 'apple',
          'options': ['olma', 'anor']
        },
      ],
      'currentIndex': 4,
      'answers': [],
      'selectedOption': null,
    });

    final notifier = TestNotifier(service, storage);
    await notifier.loadQuiz();

    expect(service.startCalls, 1);
    expect(notifier.state.testId, 'test-1');
    expect(notifier.state.currentIndex, 0);
  });
}
