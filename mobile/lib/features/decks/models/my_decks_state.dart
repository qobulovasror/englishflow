import 'package:equatable/equatable.dart';
import 'deck_model.dart';

class MyDecksState extends Equatable {
  final List<DeckModel> decks;
  final bool isLoading;
  final String? error;

  /// True while a create/update/delete request is in flight.
  final bool isSaving;

  /// The deck currently open on the detail screen, with its words.
  final DeckModel? currentDeck;
  final bool isLoadingDeck;
  final String? deckError;

  /// True while adding/removing words on the detail screen.
  final bool isMutatingWords;

  const MyDecksState({
    this.decks = const [],
    this.isLoading = false,
    this.error,
    this.isSaving = false,
    this.currentDeck,
    this.isLoadingDeck = false,
    this.deckError,
    this.isMutatingWords = false,
  });

  MyDecksState copyWith({
    List<DeckModel>? decks,
    bool? isLoading,
    String? error,
    bool? isSaving,
    DeckModel? currentDeck,
    bool? isLoadingDeck,
    String? deckError,
    bool? isMutatingWords,
    bool clearError = false,
    bool clearCurrentDeck = false,
    bool clearDeckError = false,
  }) {
    return MyDecksState(
      decks: decks ?? this.decks,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      isSaving: isSaving ?? this.isSaving,
      currentDeck: clearCurrentDeck ? null : (currentDeck ?? this.currentDeck),
      isLoadingDeck: isLoadingDeck ?? this.isLoadingDeck,
      deckError: clearDeckError ? null : (deckError ?? this.deckError),
      isMutatingWords: isMutatingWords ?? this.isMutatingWords,
    );
  }

  @override
  List<Object?> get props => [
        decks,
        isLoading,
        error,
        isSaving,
        currentDeck,
        isLoadingDeck,
        deckError,
        isMutatingWords,
      ];
}
