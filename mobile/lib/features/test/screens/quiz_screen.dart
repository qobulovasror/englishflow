import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/features/test/providers/test_provider.dart';
import 'package:englishflow/shared/widgets/loading_widget.dart';
import 'package:englishflow/shared/widgets/error_widget.dart';

class QuizScreen extends ConsumerStatefulWidget {
  const QuizScreen({super.key});

  @override
  ConsumerState<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends ConsumerState<QuizScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(testProvider.notifier).loadQuiz());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(testProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Quiz', style: AppTextStyles.heading2),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(testProvider.notifier).reset();
            context.pop();
          },
        ),
        actions: [
          if (state.questions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  '${state.currentIndex + 1}/${state.totalQuestions}',
                  style: AppTextStyles.bodyBold.copyWith(
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(state) {
    if (state.isLoading) {
      return const LoadingWidget(message: 'Loading quiz...');
    }

    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(testProvider.notifier).loadQuiz(),
      );
    }

    if (state.questions.isEmpty) {
      return const AppErrorWidget(
        message: 'No questions available. Add more words first!',
      );
    }

    final question = state.currentQuestion;
    if (question == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Progress
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: state.progressPercent,
              backgroundColor: AppColors.border,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.orange),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 40),

          // Question
          Center(
            child: Column(
              children: [
                Text(
                  'What is the translation of:',
                  style: AppTextStyles.caption,
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 20,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.secondaryLight,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    question.word,
                    style: AppTextStyles.heading1.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),

          // Options
          ...List.generate(question.options.length, (index) {
            final isSelected = state.selectedOption == index;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () =>
                    ref.read(testProvider.notifier).selectOption(index),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withOpacity(0.1)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.border,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.surface,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.border,
                          ),
                        ),
                        child: Center(
                          child: isSelected
                              ? const Icon(Icons.check,
                                  color: Colors.white, size: 18)
                              : Text(
                                  String.fromCharCode(65 + index),
                                  style: AppTextStyles.bodyBold.copyWith(
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          question.options[index],
                          style: AppTextStyles.body.copyWith(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.textPrimary,
                            fontWeight: isSelected
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),

          const Spacer(),

          // Next / Submit button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: state.selectedOption != null
                  ? () async {
                      if (state.isLastQuestion) {
                        final score = await ref
                            .read(testProvider.notifier)
                            .submitQuiz();
                        if (!mounted) return;
                        if (score != null) {
                          context.pushReplacement('/quiz-result', extra: {
                            'score': score,
                            'total': state.totalQuestions,
                          });
                        } else {
                          // Submission failed — keep the answers and let the
                          // user retry instead of showing a fake 0 score.
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                ref.read(testProvider).error ??
                                    'Failed to submit quiz',
                              ),
                            ),
                          );
                        }
                      } else {
                        ref.read(testProvider.notifier).nextQuestion();
                      }
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.orange,
              ),
              child: state.isSubmitting
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : Text(state.isLastQuestion ? 'Submit' : 'Next'),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
