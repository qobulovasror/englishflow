import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/features/auth/providers/auth_provider.dart';
import 'package:englishflow/features/learning/providers/learning_provider.dart';
import 'package:englishflow/features/progress/providers/progress_provider.dart';

class LearnScreen extends ConsumerStatefulWidget {
  const LearnScreen({super.key});

  @override
  ConsumerState<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends ConsumerState<LearnScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(progressProvider.notifier).loadProgress();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final progress = ref.watch(progressProvider);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello, ${auth.user?.displayName ?? 'Learner'}! 👋',
                        style: AppTextStyles.heading2,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Ready to learn today?',
                        style: AppTextStyles.caption,
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () => _showLogoutDialog(context),
                    child: CircleAvatar(
                      radius: 24,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(
                        (auth.user?.displayName ?? 'U')[0].toUpperCase(),
                        style: AppTextStyles.heading3.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Progress card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.trending_up,
                            color: AppColors.gold, size: 28),
                        const SizedBox(width: 8),
                        Text(
                          'Your Progress',
                          style: AppTextStyles.heading3.copyWith(
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      '${progress.stats?.learnedWords ?? 0}/${progress.stats?.totalWords ?? 0} words learned',
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: ((progress.stats?.progressPercentage ?? 0) / 100)
                            .clamp(0.0, 1.0),
                        backgroundColor: Colors.white.withOpacity(0.3),
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          AppColors.gold,
                        ),
                        minHeight: 10,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _GradientPill(
                          emoji: '🔥',
                          label:
                              '${progress.stats?.streak.current ?? 0} day streak',
                        ),
                        const SizedBox(width: 12),
                        _GradientPill(
                          icon: (progress.stats?.streak.goalMet ?? false)
                              ? Icons.check_circle
                              : Icons.flag_outlined,
                          label:
                              '${progress.stats?.streak.todayCount ?? 0}/${progress.stats?.streak.dailyGoal ?? 0} today',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Quick actions
              Text('Quick Actions', style: AppTextStyles.heading3),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _ActionCard(
                      icon: Icons.school,
                      title: 'Flashcards',
                      subtitle: 'Learn new words',
                      color: AppColors.secondary,
                      onTap: () => context.push('/flashcards'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _ActionCard(
                      icon: Icons.quiz,
                      title: 'Quick Quiz',
                      subtitle: 'Test yourself',
                      color: AppColors.orange,
                      onTap: () => context.push('/quiz'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _ActionCard(
                      icon: Icons.book,
                      title: 'My Words',
                      subtitle: '${progress.stats?.totalWords ?? 0} words',
                      color: AppColors.purple,
                      onTap: () => context.go('/words'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _ActionCard(
                      icon: Icons.bar_chart,
                      title: 'Progress',
                      subtitle: 'View stats',
                      color: AppColors.primary,
                      onTap: () => context.go('/progress'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Stats row
              Text('Your Stats', style: AppTextStyles.heading3),
              const SizedBox(height: 16),
              Row(
                children: [
                  _StatChip(
                    icon: Icons.book,
                    label: 'Total',
                    value: '${progress.stats?.totalWords ?? 0}',
                    color: AppColors.secondary,
                  ),
                  const SizedBox(width: 12),
                  _StatChip(
                    icon: Icons.check_circle,
                    label: 'Learned',
                    value: '${progress.stats?.learnedWords ?? 0}',
                    color: AppColors.success,
                  ),
                  const SizedBox(width: 12),
                  _StatChip(
                    icon: Icons.school,
                    label: 'Learning',
                    value: '${progress.stats?.learningWords ?? 0}',
                    color: AppColors.orange,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).logout();
              context.go('/login');
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _GradientPill extends StatelessWidget {
  final String? emoji;
  final IconData? icon;
  final String label;

  const _GradientPill({this.emoji, this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (emoji != null)
            Text(emoji!, style: const TextStyle(fontSize: 14))
          else if (icon != null)
            Icon(icon, color: AppColors.gold, size: 16),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTextStyles.label.copyWith(color: Colors.white),
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(title, style: AppTextStyles.bodyBold),
            const SizedBox(height: 4),
            Text(subtitle, style: AppTextStyles.caption),
          ],
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatChip({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(
              value,
              style: AppTextStyles.heading3.copyWith(color: color),
            ),
            Text(label, style: AppTextStyles.label),
          ],
        ),
      ),
    );
  }
}
