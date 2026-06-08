import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/features/test/providers/test_provider.dart';

class QuizResultScreen extends ConsumerWidget {
  final int score;
  final int total;

  const QuizResultScreen({
    super.key,
    required this.score,
    required this.total,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final percentage = total > 0 ? (score / total) : 0.0;
    final isPassing = percentage >= 0.7;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon
              Icon(
                isPassing ? Icons.celebration : Icons.sentiment_neutral,
                size: 64,
                color: isPassing ? AppColors.gold : AppColors.orange,
              ),
              const SizedBox(height: 24),

              // Title
              Text(
                isPassing ? 'Great Job!' : 'Keep Practicing!',
                style: AppTextStyles.heading1,
              ),
              const SizedBox(height: 8),
              Text(
                isPassing
                    ? 'You\'re making excellent progress!'
                    : 'You\'ll do better next time!',
                style: AppTextStyles.caption,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),

              // Score circle
              CircularPercentIndicator(
                radius: 80,
                lineWidth: 12,
                percent: percentage.clamp(0.0, 1.0),
                center: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$score/$total',
                      style: AppTextStyles.heading1.copyWith(
                        color: isPassing ? AppColors.success : AppColors.orange,
                      ),
                    ),
                    Text('correct', style: AppTextStyles.caption),
                  ],
                ),
                progressColor:
                    isPassing ? AppColors.success : AppColors.orange,
                backgroundColor: AppColors.border,
                circularStrokeCap: CircularStrokeCap.round,
                animation: true,
                animationDuration: 1200,
              ),
              const SizedBox(height: 32),

              // Percentage
              Text(
                '${(percentage * 100).toInt()}%',
                style: AppTextStyles.heading2.copyWith(
                  color: isPassing ? AppColors.success : AppColors.orange,
                ),
              ),
              const SizedBox(height: 48),

              // Buttons
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    ref.read(testProvider.notifier).reset();
                    context.go('/home');
                  },
                  child: const Text('Back to Home'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    ref.read(testProvider.notifier).reset();
                    context.pushReplacement('/quiz');
                  },
                  child: const Text('Try Again'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
