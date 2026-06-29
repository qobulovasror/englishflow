import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/models/my_decks_state.dart';
import 'package:englishflow/features/decks/services/decks_service.dart';

final myDecksProvider =
    StateNotifierProvider<MyDecksNotifier, MyDecksState>((ref) {
  return MyDecksNotifier(ref.watch(decksServiceProvider));
});

class MyDecksNotifier extends StateNotifier<MyDecksState> {
  final DecksService _service;

  MyDecksNotifier(this._service) : super(const MyDecksState());

  Future<void> loadMyDecks() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final decks = await _service.getMyDecks();
      state = state.copyWith(decks: decks, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> createDeck({
    required String title,
    String? description,
    String? level,
    bool? isPublic,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final deck = await _service.createDeck(
        title: title,
        description: description,
        level: level,
        isPublic: isPublic,
      );
      state = state.copyWith(
        decks: [deck, ...state.decks],
        isSaving: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  Future<bool> updateDeck(
    String id, {
    String? title,
    String? description,
    String? level,
    bool? isPublic,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final updated = await _service.updateDeck(
        id,
        title: title,
        description: description,
        level: level,
        isPublic: isPublic,
      );
      state = state.copyWith(
        decks: [
          for (final d in state.decks) d.id == id ? updated : d,
        ],
        currentDeck: state.currentDeck?.id == id
            ? updated.copyWith(words: state.currentDeck?.words)
            : state.currentDeck,
        isSaving: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  Future<bool> deleteDeck(String id) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await _service.deleteDeck(id);
      state = state.copyWith(
        decks: state.decks.where((d) => d.id != id).toList(),
        isSaving: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  Future<void> loadDeck(String id) async {
    state = state.copyWith(isLoadingDeck: true, clearDeckError: true);
    try {
      final deck = await _service.getDeck(id);
      state = state.copyWith(currentDeck: deck, isLoadingDeck: false);
    } catch (e) {
      state = state.copyWith(isLoadingDeck: false, deckError: e.toString());
    }
  }

  Future<bool> addWordsToDeck(
    String id,
    List<Map<String, String>> words,
  ) async {
    state = state.copyWith(isMutatingWords: true, clearDeckError: true);
    try {
      await _service.addWordsToDeck(id, words);
      // Re-fetch so the words list and counts stay authoritative.
      final deck = await _service.getDeck(id);
      state = state.copyWith(
        currentDeck: deck,
        decks: _syncCount(deck),
        isMutatingWords: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isMutatingWords: false, deckError: e.toString());
      return false;
    }
  }

  Future<bool> removeWordFromDeck(String id, String wordId) async {
    state = state.copyWith(isMutatingWords: true, clearDeckError: true);
    try {
      await _service.removeWordFromDeck(id, wordId);
      final current = state.currentDeck;
      final deck = current != null && current.id == id
          ? current.copyWith(
              words: current.words.where((w) => w.id != wordId).toList(),
              wordCount: (current.wordCount - 1).clamp(0, current.wordCount),
            )
          : current;
      state = state.copyWith(
        currentDeck: deck,
        decks: deck != null ? _syncCount(deck) : state.decks,
        isMutatingWords: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isMutatingWords: false, deckError: e.toString());
      return false;
    }
  }

  /// Mirror the deck's word count into the my-decks list entry.
  List<DeckModel> _syncCount(DeckModel deck) {
    return [
      for (final d in state.decks)
        d.id == deck.id ? d.copyWith(wordCount: deck.wordCount) : d,
    ];
  }
}
