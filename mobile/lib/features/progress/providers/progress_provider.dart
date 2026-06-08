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
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final stats = await _progressService.getProgress();
      state = state.copyWith(stats: stats, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}
