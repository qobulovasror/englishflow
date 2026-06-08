import 'package:equatable/equatable.dart';

class ProgressStats extends Equatable {
  final int totalWords;
  final int newWords;
  final int learningWords;
  final int learnedWords;
  final int progressPercentage;
  final int totalTests;
  final double averageScore;

  const ProgressStats({
    this.totalWords = 0,
    this.newWords = 0,
    this.learningWords = 0,
    this.learnedWords = 0,
    this.progressPercentage = 0,
    this.totalTests = 0,
    this.averageScore = 0,
  });

  // Used by home screen for daily goal display
  int get learnedToday => 0; // Backend doesn't track this separately
  int get streak => 0; // Backend doesn't track this separately

  factory ProgressStats.fromJson(Map<String, dynamic> json) {
    final vocabulary = json['vocabulary'] as Map<String, dynamic>? ?? {};
    final tests = json['tests'] as Map<String, dynamic>? ?? {};

    return ProgressStats(
      totalWords: vocabulary['total'] ?? 0,
      newWords: vocabulary['new'] ?? 0,
      learningWords: vocabulary['learning'] ?? 0,
      learnedWords: vocabulary['learned'] ?? 0,
      progressPercentage: vocabulary['progressPercentage'] ?? 0,
      totalTests: tests['total'] ?? 0,
      averageScore: (tests['averageScore'] ?? 0).toDouble(),
    );
  }

  @override
  List<Object?> get props => [
        totalWords,
        newWords,
        learningWords,
        learnedWords,
        progressPercentage,
        totalTests,
        averageScore,
      ];
}
