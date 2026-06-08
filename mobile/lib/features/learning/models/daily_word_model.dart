import 'package:equatable/equatable.dart';

class DailyWordModel extends Equatable {
  final String id; // userWord ID
  final String wordId;
  final String word;
  final String translation;
  final String? example;
  final String status; // NEW, LEARNING, LEARNED
  final int repetitionCount;

  const DailyWordModel({
    required this.id,
    required this.wordId,
    required this.word,
    required this.translation,
    this.example,
    required this.status,
    required this.repetitionCount,
  });

  factory DailyWordModel.fromJson(Map<String, dynamic> json) {
    return DailyWordModel(
      id: json['id']?.toString() ?? '',
      wordId: json['wordId']?.toString() ?? '',
      word: json['word'] ?? '',
      translation: json['translation'] ?? '',
      example: json['example'],
      status: json['status'] ?? 'NEW',
      repetitionCount: json['repetitionCount'] ?? 0,
    );
  }

  @override
  List<Object?> get props =>
      [id, wordId, word, translation, example, status, repetitionCount];
}
