import 'package:equatable/equatable.dart';

class DailyWordModel extends Equatable {
  final String id; // userWord ID
  final String wordId;
  final String word;
  final String translation;
  final String? pronunciation;
  final String? partOfSpeech;
  final List<String> collocations;
  final String? example;
  final String? audioUrl;
  final String status; // NEW, LEARNING, LEARNED
  final int repetitionCount;

  const DailyWordModel({
    required this.id,
    required this.wordId,
    required this.word,
    required this.translation,
    this.pronunciation,
    this.partOfSpeech,
    this.collocations = const [],
    this.example,
    this.audioUrl,
    required this.status,
    required this.repetitionCount,
  });

  factory DailyWordModel.fromJson(Map<String, dynamic> json) {
    return DailyWordModel(
      id: json['id']?.toString() ?? '',
      wordId: json['wordId']?.toString() ?? '',
      word: json['word'] ?? '',
      translation: json['translation'] ?? '',
      pronunciation: json['pronunciation']?.toString(),
      partOfSpeech: json['partOfSpeech']?.toString(),
      collocations: (json['collocations'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      example: json['example'],
      audioUrl: json['audioUrl']?.toString(),
      status: json['status'] ?? 'NEW',
      repetitionCount: json['repetitionCount'] ?? 0,
    );
  }

  @override
  List<Object?> get props => [
        id,
        wordId,
        word,
        translation,
        pronunciation,
        partOfSpeech,
        collocations,
        example,
        audioUrl,
        status,
        repetitionCount,
      ];
}
