import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/features/progress/models/progress_model.dart';
import 'package:englishflow/features/progress/providers/progress_provider.dart';
import 'package:englishflow/shared/widgets/loading_widget.dart';
import 'package:englishflow/shared/widgets/error_widget.dart';

class ProgressScreen extends ConsumerStatefulWidget {
  const ProgressScreen({super.key});

  @override
  ConsumerState<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends ConsumerState<ProgressScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(progressProvider.notifier).loadProgress());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(progressProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Progress', style: AppTextStyles.heading2),
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(state) {
    if (state.isLoading && state.stats == null) {
      return const LoadingWidget(message: 'Loading progress...');
    }

    if (state.error != null && state.stats == null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(progressProvider.notifier).loadProgress(),
      );
    }

    final stats = state.stats;
    if (stats == null) {
      return const AppErrorWidget(message: 'No progress data available');
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(progressProvider.notifier).loadProgress(),
      color: AppColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Main progress circle
            Center(
              child: CircularPercentIndicator(
                radius: 90,
                lineWidth: 14,
                percent: (stats.progressPercentage / 100).clamp(0.0, 1.0),
                center: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '${stats.progressPercentage}%',
                      style: AppTextStyles.heading1.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                    Text('mastered', style: AppTextStyles.caption),
                  ],
                ),
                progressColor: AppColors.primary,
                backgroundColor: AppColors.border,
                circularStrokeCap: CircularStrokeCap.round,
                animation: true,
                animationDuration: 1000,
              ),
            ),
            const SizedBox(height: 24),

            // Streak + daily goal
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: _StreakCard(streak: stats.streak)),
                  const SizedBox(width: 16),
                  Expanded(child: _DailyGoalCard(streak: stats.streak)),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Stats grid
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.book,
                    title: 'Total Words',
                    value: '${stats.totalWords}',
                    color: AppColors.secondary,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _StatCard(
                    icon: Icons.check_circle,
                    title: 'Learned',
                    value: '${stats.learnedWords}',
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.school,
                    title: 'Learning',
                    value: '${stats.learningWords}',
                    color: AppColors.orange,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _StatCard(
                    icon: Icons.fiber_new,
                    title: 'New',
                    value: '${stats.newWords}',
                    color: AppColors.gold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.quiz,
                    title: 'Tests Done',
                    value: '${stats.totalTests}',
                    color: AppColors.purple,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _StatCard(
                    icon: Icons.gps_fixed,
                    title: 'Avg Score',
                    value: '${stats.averageScore.toInt()}%',
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Progress bars section
            Text('Breakdown', style: AppTextStyles.heading3),
            const SizedBox(height: 16),
            _ProgressBar(
              label: 'Words Learned',
              value: stats.learnedWords,
              total: stats.totalWords,
              color: AppColors.success,
            ),
            const SizedBox(height: 16),
            _ProgressBar(
              label: 'Words in Progress',
              value: stats.learningWords,
              total: stats.totalWords,
              color: AppColors.orange,
            ),
          ],
        ),
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  final StreakInfo streak;

  const _StreakCard({required this.streak});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.orange.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.orange.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Text('🔥', style: TextStyle(fontSize: 26)),
              const SizedBox(width: 8),
              Text(
                '${streak.current}',
                style: AppTextStyles.heading1.copyWith(color: AppColors.orange),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('day streak', style: AppTextStyles.caption),
          const SizedBox(height: 4),
          Text('Longest: ${streak.longest}', style: AppTextStyles.label),
        ],
      ),
    );
  }
}

class _DailyGoalCard extends StatelessWidget {
  final StreakInfo streak;

  const _DailyGoalCard({required this.streak});

  @override
  Widget build(BuildContext context) {
    final met = streak.goalMet;
    final color = met ? AppColors.success : AppColors.primary;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircularPercentIndicator(
            radius: 34,
            lineWidth: 7,
            percent: streak.goalProgress,
            center: met
                ? const Icon(Icons.check_rounded,
                    color: AppColors.success, size: 26)
                : Text(
                    '${streak.todayCount}/${streak.dailyGoal}',
                    style: AppTextStyles.caption.copyWith(color: color),
                  ),
            progressColor: color,
            backgroundColor: AppColors.border,
            circularStrokeCap: CircularStrokeCap.round,
            animation: true,
            animationDuration: 800,
          ),
          const SizedBox(height: 12),
          Text('daily goal', style: AppTextStyles.caption),
          const SizedBox(height: 4),
          Text(
            met ? 'Goal met! 🎉' : '${streak.todayCount} / ${streak.dailyGoal} today',
            style: AppTextStyles.label,
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 12),
          Text(
            value,
            style: AppTextStyles.heading2.copyWith(color: color),
          ),
          const SizedBox(height: 4),
          Text(title, style: AppTextStyles.caption),
        ],
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  final String label;
  final int value;
  final int total;
  final Color color;

  const _ProgressBar({
    required this.label,
    required this.value,
    required this.total,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final percent = total > 0 ? (value / total).clamp(0.0, 1.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: AppTextStyles.bodyBold),
            Text(
              '$value / $total',
              style: AppTextStyles.caption.copyWith(color: color),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: percent,
            backgroundColor: AppColors.border,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 12,
          ),
        ),
      ],
    );
  }
}
