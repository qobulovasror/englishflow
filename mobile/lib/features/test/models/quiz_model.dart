import 'package:equatable/equatable.dart';

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
