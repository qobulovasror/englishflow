import 'package:equatable/equatable.dart';
import 'word_model.dart';

class WordsState extends Equatable {
  final List<WordModel> words;
  final bool isLoading;
  final String? error;
  final bool isAdding;

  const WordsState({
    this.words = const [],
    this.isLoading = false,
    this.error,
    this.isAdding = false,
  });

  WordsState copyWith({
    List<WordModel>? words,
    bool? isLoading,
    String? error,
    bool? isAdding,
    bool clearError = false,
  }) {
    return WordsState(
      words: words ?? this.words,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      isAdding: isAdding ?? this.isAdding,
    );
  }

  @override
  List<Object?> get props => [words, isLoading, error, isAdding];
}
