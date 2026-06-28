import 'package:equatable/equatable.dart';
import 'package:englishflow/features/words/models/word_model.dart';

class DeckModel extends Equatable {
  final String id;
  final String title;
  final String? description;
  final String? level;
  final bool isSystem;
  final bool isPublic;
  final int wordCount;
  final bool isEnrolled;

  /// Populated only by `GET /decks/:id`; empty for list responses.
  final List<WordModel> words;

  const DeckModel({
    required this.id,
    required this.title,
    this.description,
    this.level,
    this.isSystem = false,
    this.isPublic = false,
    this.wordCount = 0,
    this.isEnrolled = false,
    this.words = const [],
  });

  factory DeckModel.fromJson(Map<String, dynamic> json) {
    final rawWords = json['words'];
    return DeckModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description']?.toString(),
      level: json['level']?.toString(),
      isSystem: json['isSystem'] == true,
      isPublic: json['isPublic'] == true,
      wordCount: (json['wordCount'] as num?)?.toInt() ??
          (rawWords is List ? rawWords.length : 0),
      isEnrolled: json['isEnrolled'] == true,
      words: rawWords is List
          ? rawWords
              .map((w) => WordModel.fromJson(w as Map<String, dynamic>))
              .toList()
          : const [],
    );
  }

  DeckModel copyWith({
    String? title,
    String? description,
    String? level,
    bool? isPublic,
    int? wordCount,
    bool? isEnrolled,
    List<WordModel>? words,
  }) {
    return DeckModel(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      level: level ?? this.level,
      isSystem: isSystem,
      isPublic: isPublic ?? this.isPublic,
      wordCount: wordCount ?? this.wordCount,
      isEnrolled: isEnrolled ?? this.isEnrolled,
      words: words ?? this.words,
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        level,
        isSystem,
        isPublic,
        wordCount,
        isEnrolled,
        words,
      ];
}
