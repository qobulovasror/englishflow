import 'package:equatable/equatable.dart';
import 'progress_model.dart';

class ProgressState extends Equatable {
  final ProgressStats? stats;
  final bool isLoading;
  final String? error;

  const ProgressState({
    this.stats,
    this.isLoading = false,
    this.error,
  });

  ProgressState copyWith({
    ProgressStats? stats,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return ProgressState(
      stats: stats ?? this.stats,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [stats, isLoading, error];
}
