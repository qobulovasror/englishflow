import 'package:equatable/equatable.dart';

class WordModel extends Equatable {
  final String id;
  final String word;
  final String translation;
  final String? example;
  final String? audioUrl;
  final DateTime? createdAt;

  const WordModel({
    required this.id,
    required this.word,
    required this.translation,
    this.example,
    this.audioUrl,
    this.createdAt,
  });

  factory WordModel.fromJson(Map<String, dynamic> json) {
    return WordModel(
      id: json['id']?.toString() ?? '',
      word: json['word'] ?? '',
      translation: json['translation'] ?? '',
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
  List<Object?> get props =>
      [id, word, translation, example, audioUrl, createdAt];
}
