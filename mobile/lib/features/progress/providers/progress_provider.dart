import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/features/progress/models/progress_state.dart';
import 'package:englishflow/features/progress/services/progress_service.dart';

final progressProvider =
    StateNotifierProvider<ProgressNotifier, ProgressState>((ref) {
  return ProgressNotifier(ref.watch(progressServiceProvider));
});

class ProgressNotifier extends StateNotifier<ProgressState> {
  final ProgressService _progressService;

  ProgressNotifier(this._progressService) : super(const ProgressState());

  Future<void> loadProgress() async {
    await Future.wait([
      _loadStats(),
      loadTrends(days: state.trendDays),
      loadDecks(),
      loadLeeches(),
    ]);
  }

  Future<void> _loadStats() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final stats = await _progressService.getProgress();
      state = state.copyWith(stats: stats, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadTrends({required int days}) async {
    state = state.copyWith(
      trendDays: days,
      trendsLoading: true,
      clearTrendsError: true,
    );
    try {
      final trends = await _progressService.getTrends(days: days);
      state = state.copyWith(trends: trends, trendsLoading: false);
    } catch (e) {
      state = state.copyWith(trendsLoading: false, trendsError: e.toString());
    }
  }

  Future<void> loadDecks() async {
    state = state.copyWith(decksLoading: true, clearDecksError: true);
    try {
      final decks = await _progressService.getDeckProgress();
      state = state.copyWith(decks: decks, decksLoading: false);
    } catch (e) {
      state = state.copyWith(decksLoading: false, decksError: e.toString());
    }
  }

  Future<void> loadLeeches() async {
    state = state.copyWith(leechesLoading: true, clearLeechesError: true);
    try {
      final leeches = await _progressService.getLeeches();
      state = state.copyWith(leeches: leeches, leechesLoading: false);
    } catch (e) {
      state = state.copyWith(leechesLoading: false, leechesError: e.toString());
    }
  }
}
