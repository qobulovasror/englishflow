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

/// A single day's review count from `GET /progress/trends`.
class TrendPoint extends Equatable {
  final String date;
  final int count;

  const TrendPoint({required this.date, this.count = 0});

  factory TrendPoint.fromJson(Map<String, dynamic> json) {
    return TrendPoint(
      date: json['date']?.toString() ?? '',
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [date, count];
}

/// Per-deck progress breakdown from `GET /progress/decks`.
class DeckProgress extends Equatable {
  final String id;
  final String title;
  final String? level;
  final bool isSystem;
  final int total;
  final int newWords;
  final int learning;
  final int learned;
  final int progressPercentage;

  const DeckProgress({
    required this.id,
    required this.title,
    this.level,
    this.isSystem = false,
    this.total = 0,
    this.newWords = 0,
    this.learning = 0,
    this.learned = 0,
    this.progressPercentage = 0,
  });

  factory DeckProgress.fromJson(Map<String, dynamic> json) {
    return DeckProgress(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      level: json['level']?.toString(),
      isSystem: json['isSystem'] == true,
      total: (json['total'] as num?)?.toInt() ?? 0,
      newWords: (json['new'] as num?)?.toInt() ?? 0,
      learning: (json['learning'] as num?)?.toInt() ?? 0,
      learned: (json['learned'] as num?)?.toInt() ?? 0,
      progressPercentage: (json['progressPercentage'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        level,
        isSystem,
        total,
        newWords,
        learning,
        learned,
        progressPercentage,
      ];
}

/// A high-lapse word ("leech") from `GET /progress/leeches`.
class Leech extends Equatable {
  final String wordId;
  final String word;
  final String translation;
  final int lapses;
  final String? status;
  final String? lastReviewedAt;

  const Leech({
    required this.wordId,
    required this.word,
    this.translation = '',
    this.lapses = 0,
    this.status,
    this.lastReviewedAt,
  });

  factory Leech.fromJson(Map<String, dynamic> json) {
    return Leech(
      wordId: json['wordId']?.toString() ?? '',
      word: json['word'] ?? '',
      translation: json['translation'] ?? '',
      lapses: (json['lapses'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString(),
      lastReviewedAt: json['lastReviewedAt']?.toString(),
    );
  }

  @override
  List<Object?> get props =>
      [wordId, word, translation, lapses, status, lastReviewedAt];
}
