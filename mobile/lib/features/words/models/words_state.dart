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

  // Pagination: current page loaded, whether more pages exist, and whether a
  // "load more" fetch is in flight.
  final int page;
  final bool hasMore;
  final bool isLoadingMore;

  const WordsState({
    this.words = const [],
    this.isLoading = false,
    this.error,
    this.isAdding = false,
    this.isUpdating = false,
    this.statusFilter,
    this.page = 1,
    this.hasMore = false,
    this.isLoadingMore = false,
  });

  WordsState copyWith({
    List<WordModel>? words,
    bool? isLoading,
    String? error,
    bool? isAdding,
    bool? isUpdating,
    String? statusFilter,
    int? page,
    bool? hasMore,
    bool? isLoadingMore,
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
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [
        words,
        isLoading,
        error,
        isAdding,
        isUpdating,
        statusFilter,
        page,
        hasMore,
        isLoadingMore,
      ];
}
