import 'package:equatable/equatable.dart';
import 'word_model.dart';

class WordsState extends Equatable {
  final List<WordModel> words;
  final bool isLoading;
  final String? error;
  final bool isAdding;
  final bool isUpdating;

  /// Active status filter (NEW|LEARNING|LEARNED). Null means "All".
  final String? statusFilter;

  const WordsState({
    this.words = const [],
    this.isLoading = false,
    this.error,
    this.isAdding = false,
    this.isUpdating = false,
    this.statusFilter,
  });

  WordsState copyWith({
    List<WordModel>? words,
    bool? isLoading,
    String? error,
    bool? isAdding,
    bool? isUpdating,
    String? statusFilter,
    bool clearError = false,
    bool clearStatusFilter = false,
  }) {
    return WordsState(
      words: words ?? this.words,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      isAdding: isAdding ?? this.isAdding,
      isUpdating: isUpdating ?? this.isUpdating,
      statusFilter:
          clearStatusFilter ? null : (statusFilter ?? this.statusFilter),
    );
  }

  @override
  List<Object?> get props =>
      [words, isLoading, error, isAdding, isUpdating, statusFilter];
}
