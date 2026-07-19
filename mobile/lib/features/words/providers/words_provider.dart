import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/features/words/models/words_state.dart';
import 'package:englishflow/features/words/services/words_service.dart';

final wordsProvider = StateNotifierProvider<WordsNotifier, WordsState>((ref) {
  return WordsNotifier(ref.watch(wordsServiceProvider));
});

class WordsNotifier extends StateNotifier<WordsState> {
  final WordsService _wordsService;

  static const int _pageSize = 20;

  WordsNotifier(this._wordsService) : super(const WordsState());

  Future<void> loadWords() async {
    // Reset pagination flags too — any in-flight loadMore is now stale and its
    // filter guard will discard it.
    state = state.copyWith(
      isLoading: true,
      isLoadingMore: false,
      clearError: true,
    );
    try {
      final res = await _wordsService.getWordsPage(
        page: 1,
        limit: _pageSize,
        status: state.statusFilter,
      );
      state = state.copyWith(
        words: res.items,
        page: res.page,
        hasMore: res.hasMore,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Appends the next page. No-op while another load is in flight or when the
  /// last page has already been reached.
  Future<void> loadMore() async {
    if (state.isLoadingMore || state.isLoading || !state.hasMore) return;
    // Capture the filter this fetch belongs to; if it changes mid-flight we
    // must NOT append the stale page onto the (now different) list.
    final filter = state.statusFilter;
    state = state.copyWith(isLoadingMore: true, clearError: true);
    try {
      final res = await _wordsService.getWordsPage(
        page: state.page + 1,
        limit: _pageSize,
        status: filter,
      );
      if (state.statusFilter != filter) {
        // Filter switched while loading — discard this page.
        state = state.copyWith(isLoadingMore: false);
        return;
      }
      state = state.copyWith(
        words: [...state.words, ...res.items],
        page: res.page,
        hasMore: res.hasMore,
        isLoadingMore: false,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }

  /// Sets the active status filter ([status] = NEW|LEARNING|LEARNED, or null
  /// for "All") and reloads the list. No-op if the filter is unchanged.
  Future<void> setStatusFilter(String? status) async {
    if (status == state.statusFilter) return;
    state = status == null
        ? state.copyWith(clearStatusFilter: true)
        : state.copyWith(statusFilter: status);
    await loadWords();
  }

  Future<bool> addWord({
    required String word,
    required String translation,
    String? example,
  }) async {
    state = state.copyWith(isAdding: true, clearError: true);
    try {
      final newWord = await _wordsService.addWord(
        word: word,
        translation: translation,
        example: example,
      );
      // A brand-new word is NEW, so it only belongs in the current view when
      // no filter is active or the filter is exactly 'NEW'. Otherwise leave the
      // list untouched; the next reload will surface it.
      final filter = state.statusFilter;
      final belongsInView = filter == null || filter == 'NEW';
      state = state.copyWith(
        words: belongsInView ? [newWord, ...state.words] : state.words,
        isAdding: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isAdding: false, error: e.toString());
      return false;
    }
  }

  Future<bool> updateWord(
    String id, {
    String? word,
    String? translation,
    String? example,
  }) async {
    state = state.copyWith(isUpdating: true, clearError: true);
    try {
      final updated = await _wordsService.updateWord(
        id,
        word: word,
        translation: translation,
        example: example,
      );
      state = state.copyWith(
        words: [
          for (final w in state.words) w.id == id ? updated : w,
        ],
        isUpdating: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isUpdating: false, error: e.toString());
      return false;
    }
  }

  Future<bool> deleteWord(String id) async {
    try {
      await _wordsService.deleteWord(id);
      state = state.copyWith(
        words: state.words.where((w) => w.id != id).toList(),
      );
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
}
