import 'package:equatable/equatable.dart';

class WordModel extends Equatable {
  final String id;
  final String word;
  final String translation;
  final String? pronunciation;
  final String? partOfSpeech;
  final List<String> collocations;
  final String? example;
  final String? audioUrl;
  final DateTime? createdAt;

  const WordModel({
    required this.id,
    required this.word,
    required this.translation,
    this.pronunciation,
    this.partOfSpeech,
    this.collocations = const [],
    this.example,
    this.audioUrl,
    this.createdAt,
  });

  factory WordModel.fromJson(Map<String, dynamic> json) {
    return WordModel(
      id: json['id']?.toString() ?? '',
      word: json['word'] ?? '',
      translation: json['translation'] ?? '',
      pronunciation: json['pronunciation']?.toString(),
      partOfSpeech: json['partOfSpeech']?.toString(),
      collocations: (json['collocations'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      example: json['example'],
      audioUrl: json['audioUrl']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'word': word,
      'translation': translation,
      if (example != null) 'example': example,
    };
  }

  @override
  List<Object?> get props => [
        id,
        word,
        translation,
        pronunciation,
        partOfSpeech,
        collocations,
        example,
        audioUrl,
        createdAt
      ];
}
