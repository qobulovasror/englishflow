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
            const SizedBox(height: 32),

            // Review trend
            _TrendSection(
              trends: state.trends,
              trendDays: state.trendDays,
              isLoading: state.trendsLoading,
              error: state.trendsError,
              onSelectDays: (days) =>
                  ref.read(progressProvider.notifier).loadTrends(days: days),
              onRetry: () => ref
                  .read(progressProvider.notifier)
                  .loadTrends(days: state.trendDays),
            ),
            const SizedBox(height: 24),

            // Per-deck progress
            _DeckProgressSection(
              decks: state.decks,
              isLoading: state.decksLoading,
              error: state.decksError,
              onRetry: () => ref.read(progressProvider.notifier).loadDecks(),
            ),
            const SizedBox(height: 24),

            // Leeches
            _LeechesSection(
              leeches: state.leeches,
              isLoading: state.leechesLoading,
              error: state.leechesError,
              onRetry: () => ref.read(progressProvider.notifier).loadLeeches(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Card shell shared by the analytics sections: title row + per-section
/// loading / error / content handling.
class _SectionCard extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final bool isLoading;
  final String? error;
  final VoidCallback onRetry;
  final Widget child;

  const _SectionCard({
    required this.title,
    this.trailing,
    required this.isLoading,
    required this.error,
    required this.onRetry,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    Widget body;
    if (isLoading) {
      body = const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: AppColors.primary,
            ),
          ),
        ),
      );
    } else if (error != null) {
      body = Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text('Failed to load', style: AppTextStyles.caption),
            ),
            TextButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      );
    } else {
      body = child;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(child: Text(title, style: AppTextStyles.heading3)),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 16),
          body,
        ],
      ),
    );
  }
}

class _TrendSection extends StatelessWidget {
  final List<TrendPoint> trends;
  final int trendDays;
  final bool isLoading;
  final String? error;
  final ValueChanged<int> onSelectDays;
  final VoidCallback onRetry;

  const _TrendSection({
    required this.trends,
    required this.trendDays,
    required this.isLoading,
    required this.error,
    required this.onSelectDays,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final maxCount =
        trends.fold<int>(0, (m, t) => t.count > m ? t.count : m);
    final total = trends.fold<int>(0, (s, t) => s + t.count);

    Widget content;
    if (trends.isEmpty || maxCount == 0) {
      content = const _EmptyHint(
        icon: Icons.bar_chart_rounded,
        message: 'No reviews yet in this period.',
      );
    } else {
      content = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$total reviews · last $trendDays days',
            style: AppTextStyles.caption,
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 120,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final t in trends)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1),
                      child: FractionallySizedBox(
                        alignment: Alignment.bottomCenter,
                        heightFactor: t.count > 0
                            ? (t.count / maxCount).clamp(0.06, 1.0)
                            : 0.02,
                        child: Container(
                          decoration: BoxDecoration(
                            color: t.count > 0
                                ? AppColors.primary
                                : AppColors.border,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(3),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(_shortDate(trends.first.date), style: AppTextStyles.label),
              Text(_shortDate(trends.last.date), style: AppTextStyles.label),
            ],
          ),
        ],
      );
    }

    return _SectionCard(
      title: 'Review Trend',
      trailing: ToggleButtons(
        isSelected: [trendDays == 7, trendDays == 30],
        onPressed: isLoading
            ? null
            : (i) => onSelectDays(i == 0 ? 7 : 30),
        borderRadius: BorderRadius.circular(8),
        constraints: const BoxConstraints(minWidth: 44, minHeight: 32),
        selectedColor: Colors.white,
        fillColor: AppColors.primary,
        color: AppColors.textSecondary,
        borderColor: AppColors.border,
        selectedBorderColor: AppColors.primary,
        textStyle: AppTextStyles.label,
        children: const [Text('7d'), Text('30d')],
      ),
      isLoading: isLoading,
      error: error,
      onRetry: onRetry,
      child: content,
    );
  }

  /// Renders an ISO date string like `2026-06-29` as `06/29`.
  static String _shortDate(String date) {
    final parts = date.split('-');
    return parts.length >= 3 ? '${parts[1]}/${parts[2]}' : date;
  }
}

class _DeckProgressSection extends StatelessWidget {
  final List<DeckProgress> decks;
  final bool isLoading;
  final String? error;
  final VoidCallback onRetry;

  const _DeckProgressSection({
    required this.decks,
    required this.isLoading,
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    Widget content;
    if (decks.isEmpty) {
      content = const _EmptyHint(
        icon: Icons.style_outlined,
        message: 'No decks yet. Join one from the library.',
      );
    } else {
      content = Column(
        children: [
          for (var i = 0; i < decks.length; i++) ...[
            if (i > 0) const SizedBox(height: 20),
            _DeckProgressRow(deck: decks[i]),
          ],
        ],
      );
    }

    return _SectionCard(
      title: 'Deck Progress',
      isLoading: isLoading,
      error: error,
      onRetry: onRetry,
      child: content,
    );
  }
}

class _DeckProgressRow extends StatelessWidget {
  final DeckProgress deck;

  const _DeckProgressRow({required this.deck});

  @override
  Widget build(BuildContext context) {
    final percent = (deck.progressPercentage / 100).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                deck.title,
                style: AppTextStyles.bodyBold,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (deck.level != null && deck.level!.isNotEmpty) ...[
              const SizedBox(width: 8),
              _LevelBadge(level: deck.level!),
            ],
            const SizedBox(width: 8),
            Text(
              '${deck.progressPercentage}%',
              style: AppTextStyles.caption.copyWith(color: AppColors.primary),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: percent,
            backgroundColor: AppColors.border,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
            minHeight: 10,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _CountChip(label: 'new', value: deck.newWords, color: AppColors.gold),
            const SizedBox(width: 12),
            _CountChip(
              label: 'learning',
              value: deck.learning,
              color: AppColors.orange,
            ),
            const SizedBox(width: 12),
            _CountChip(
              label: 'learned',
              value: deck.learned,
              color: AppColors.success,
            ),
          ],
        ),
      ],
    );
  }
}

class _CountChip extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _CountChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text('$value $label', style: AppTextStyles.label),
      ],
    );
  }
}

class _LevelBadge extends StatelessWidget {
  final String level;

  const _LevelBadge({required this.level});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.secondary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        level.toUpperCase(),
        style: AppTextStyles.label.copyWith(color: AppColors.secondary),
      ),
    );
  }
}

class _LeechesSection extends StatelessWidget {
  final List<Leech> leeches;
  final bool isLoading;
  final String? error;
  final VoidCallback onRetry;

  const _LeechesSection({
    required this.leeches,
    required this.isLoading,
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    Widget content;
    if (leeches.isEmpty) {
      content = const _EmptyHint(
        icon: Icons.celebration_outlined,
        message: 'No tricky words right now. Great job!',
      );
    } else {
      content = Column(
        children: [
          for (var i = 0; i < leeches.length; i++) ...[
            if (i > 0)
              const Divider(height: 20, color: AppColors.border),
            _LeechRow(leech: leeches[i]),
          ],
        ],
      );
    }

    return _SectionCard(
      title: 'Words to Review',
      isLoading: isLoading,
      error: error,
      onRetry: onRetry,
      child: content,
    );
  }
}

class _LeechRow extends StatelessWidget {
  final Leech leech;

  const _LeechRow({required this.leech});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                leech.word,
                style: AppTextStyles.bodyBold,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (leech.translation.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  leech.translation,
                  style: AppTextStyles.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.red.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '${leech.lapses}× missed',
            style: AppTextStyles.label.copyWith(color: AppColors.red),
          ),
        ),
      ],
    );
  }
}

class _EmptyHint extends StatelessWidget {
  final IconData icon;
  final String message;

  const _EmptyHint({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          Icon(icon, color: AppColors.textHint, size: 22),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: AppTextStyles.caption)),
        ],
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
