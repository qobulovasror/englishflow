import 'package:equatable/equatable.dart';
import 'progress_model.dart';

class ProgressState extends Equatable {
  final ProgressStats? stats;
  final bool isLoading;
  final String? error;

  // Review trend section
  final List<TrendPoint> trends;
  final int trendDays;
  final bool trendsLoading;
  final String? trendsError;

  // Per-deck progress section
  final List<DeckProgress> decks;
  final bool decksLoading;
  final String? decksError;

  // Leeches ("words to review") section
  final List<Leech> leeches;
  final bool leechesLoading;
  final String? leechesError;

  const ProgressState({
    this.stats,
    this.isLoading = false,
    this.error,
    this.trends = const [],
    this.trendDays = 30,
    this.trendsLoading = false,
    this.trendsError,
    this.decks = const [],
    this.decksLoading = false,
    this.decksError,
    this.leeches = const [],
    this.leechesLoading = false,
    this.leechesError,
  });

  ProgressState copyWith({
    ProgressStats? stats,
    bool? isLoading,
    String? error,
    bool clearError = false,
    List<TrendPoint>? trends,
    int? trendDays,
    bool? trendsLoading,
    String? trendsError,
    bool clearTrendsError = false,
    List<DeckProgress>? decks,
    bool? decksLoading,
    String? decksError,
    bool clearDecksError = false,
    List<Leech>? leeches,
    bool? leechesLoading,
    String? leechesError,
    bool clearLeechesError = false,
  }) {
    return ProgressState(
      stats: stats ?? this.stats,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      trends: trends ?? this.trends,
      trendDays: trendDays ?? this.trendDays,
      trendsLoading: trendsLoading ?? this.trendsLoading,
      trendsError: clearTrendsError ? null : (trendsError ?? this.trendsError),
      decks: decks ?? this.decks,
      decksLoading: decksLoading ?? this.decksLoading,
      decksError: clearDecksError ? null : (decksError ?? this.decksError),
      leeches: leeches ?? this.leeches,
      leechesLoading: leechesLoading ?? this.leechesLoading,
      leechesError:
          clearLeechesError ? null : (leechesError ?? this.leechesError),
    );
  }

  @override
  List<Object?> get props => [
        stats,
        isLoading,
        error,
        trends,
        trendDays,
        trendsLoading,
        trendsError,
        decks,
        decksLoading,
        decksError,
        leeches,
        leechesLoading,
        leechesError,
      ];
}
