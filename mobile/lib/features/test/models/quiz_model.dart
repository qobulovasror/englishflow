import 'package:equatable/equatable.dart';

/// Result of starting a quiz: the server-issued test id plus its questions.
/// The id must be sent back on submit so the server grades against the exact
/// challenge it persisted.
class QuizStart {
  final String testId;
  final List<QuizQuestion> questions;

  const QuizStart({required this.testId, required this.questions});
}

class QuizQuestion extends Equatable {
  final String wordId;
  final String word;
  final List<String> options;

  const QuizQuestion({
    required this.wordId,
    required this.word,
    required this.options,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      wordId: json['wordId']?.toString() ?? '',
      word: json['word'] ?? '',
      options: List<String>.from(json['options'] ?? []),
    );
  }

  @override
  List<Object?> get props => [wordId, word, options];
}

class QuizAnswer extends Equatable {
  final String wordId;
  final String selectedAnswer;

  const QuizAnswer({
    required this.wordId,
    required this.selectedAnswer,
  });

  Map<String, dynamic> toJson() {
    return {
      'wordId': wordId,
      'selectedAnswer': selectedAnswer,
    };
  }

  @override
  List<Object?> get props => [wordId, selectedAnswer];
}
