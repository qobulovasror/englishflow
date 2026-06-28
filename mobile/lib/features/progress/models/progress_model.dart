import 'package:equatable/equatable.dart';

/// Streak + daily-goal info returned under `streak` by `GET /progress`.
class StreakInfo extends Equatable {
  final int current;
  final int longest;
  final int todayCount;
  final int dailyGoal;
  final bool goalMet;

  const StreakInfo({
    this.current = 0,
    this.longest = 0,
    this.todayCount = 0,
    this.dailyGoal = 0,
    this.goalMet = false,
  });

  /// Fraction of the daily goal completed today, clamped to 0..1.
  double get goalProgress =>
      dailyGoal > 0 ? (todayCount / dailyGoal).clamp(0.0, 1.0) : 0.0;

  factory StreakInfo.fromJson(Map<String, dynamic> json) {
    return StreakInfo(
      current: json['current'] ?? 0,
      longest: json['longest'] ?? 0,
      todayCount: json['todayCount'] ?? 0,
      dailyGoal: json['dailyGoal'] ?? 0,
      goalMet: json['goalMet'] ?? false,
    );
  }

  @override
  List<Object?> get props => [current, longest, todayCount, dailyGoal, goalMet];
}

class ProgressStats extends Equatable {
  final int totalWords;
  final int newWords;
  final int learningWords;
  final int learnedWords;
  final int progressPercentage;
  final int totalTests;
  final double averageScore;
  final StreakInfo streak;

  const ProgressStats({
    this.totalWords = 0,
    this.newWords = 0,
    this.learningWords = 0,
    this.learnedWords = 0,
    this.progressPercentage = 0,
    this.totalTests = 0,
    this.averageScore = 0,
    this.streak = const StreakInfo(),
  });

  factory ProgressStats.fromJson(Map<String, dynamic> json) {
    final vocabulary = json['vocabulary'] as Map<String, dynamic>? ?? {};
    final tests = json['tests'] as Map<String, dynamic>? ?? {};
    final streak = json['streak'] as Map<String, dynamic>?;

    return ProgressStats(
      totalWords: vocabulary['total'] ?? 0,
      newWords: vocabulary['new'] ?? 0,
      learningWords: vocabulary['learning'] ?? 0,
      learnedWords: vocabulary['learned'] ?? 0,
      progressPercentage: vocabulary['progressPercentage'] ?? 0,
      totalTests: tests['total'] ?? 0,
      averageScore: (tests['averageScore'] ?? 0).toDouble(),
      streak: streak != null ? StreakInfo.fromJson(streak) : const StreakInfo(),
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
        streak,
      ];
}
