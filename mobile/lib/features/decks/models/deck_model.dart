import 'package:equatable/equatable.dart';

class DeckModel extends Equatable {
  final String id;
  final String title;
  final String? description;
  final String? level;
  final bool isSystem;
  final int wordCount;
  final bool isEnrolled;

  const DeckModel({
    required this.id,
    required this.title,
    this.description,
    this.level,
    this.isSystem = false,
    this.wordCount = 0,
    this.isEnrolled = false,
  });

  factory DeckModel.fromJson(Map<String, dynamic> json) {
    return DeckModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description']?.toString(),
      level: json['level']?.toString(),
      isSystem: json['isSystem'] == true,
      wordCount: (json['wordCount'] as num?)?.toInt() ?? 0,
      isEnrolled: json['isEnrolled'] == true,
    );
  }

  DeckModel copyWith({bool? isEnrolled}) {
    return DeckModel(
      id: id,
      title: title,
      description: description,
      level: level,
      isSystem: isSystem,
      wordCount: wordCount,
      isEnrolled: isEnrolled ?? this.isEnrolled,
    );
  }

  @override
  List<Object?> get props =>
      [id, title, description, level, isSystem, wordCount, isEnrolled];
}
