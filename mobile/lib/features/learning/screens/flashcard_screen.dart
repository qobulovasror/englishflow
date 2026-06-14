import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/features/learning/providers/learning_provider.dart';
import 'package:englishflow/features/learning/services/learning_service.dart';
import 'package:englishflow/shared/widgets/loading_widget.dart';
import 'package:englishflow/shared/widgets/error_widget.dart';

class FlashcardScreen extends ConsumerStatefulWidget {
  const FlashcardScreen({super.key});

  @override
  ConsumerState<FlashcardScreen> createState() => _FlashcardScreenState();
}

class _FlashcardScreenState extends ConsumerState<FlashcardScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _flipController;
  late Animation<double> _flipAnimation;

  @override
  void initState() {
    super.initState();
    _flipController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _flipAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _flipController, curve: Curves.easeInOut),
    );
    Future.microtask(() => ref.read(learningProvider.notifier).loadDailyWords());
  }

  @override
  void dispose() {
    _flipController.dispose();
    super.dispose();
  }

  void _flipCard() {
    ref.read(learningProvider.notifier).flipCard();
    if (_flipController.isCompleted) {
      _flipController.reverse();
    } else {
      _flipController.forward();
    }
  }

  void _markWord(ReviewRating rating) {
    _flipController.reset();
    ref.read(learningProvider.notifier).markWord(rating);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(learningProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Flashcards', style: AppTextStyles.heading2),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (state.dailyWords.isNotEmpty && !state.isCompleted)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  '${state.currentIndex + 1}/${state.totalWords}',
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
      return const LoadingWidget(message: 'Loading flashcards...');
    }

    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(learningProvider.notifier).loadDailyWords(),
      );
    }

    if (state.isCompleted) {
      return _buildCompletedView(state);
    }

    if (state.dailyWords.isEmpty) {
      return AppErrorWidget(
        message: 'No words available for today',
        onRetry: () => ref.read(learningProvider.notifier).loadDailyWords(),
      );
    }

    return _buildFlashcardView(state);
  }

  Widget _buildFlashcardView(state) {
    final word = state.currentWord!;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: state.progressPercent,
              backgroundColor: AppColors.border,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.primary),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 32),

          // Flashcard
          Expanded(
            child: GestureDetector(
              onTap: _flipCard,
              child: AnimatedBuilder(
                animation: _flipAnimation,
                builder: (context, child) {
                  final angle = _flipAnimation.value * math.pi;
                  final isFront = _flipAnimation.value < 0.5;

                  return Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()
                      ..setEntry(3, 2, 0.001)
                      ..rotateY(angle),
                    child: isFront
                        ? _buildCardFront(word.word)
                        : Transform(
                            alignment: Alignment.center,
                            transform: Matrix4.identity()..rotateY(math.pi),
                            child: _buildCardBack(
                              word.translation,
                              word.example,
                            ),
                          ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 24),

          if (!state.isFlipped)
            Text(
              'Tap the card to reveal translation',
              style: AppTextStyles.caption,
            )
          else ...[
            Row(
              children: [
                Expanded(
                  child: _RatingButton(
                    label: 'Again',
                    color: AppColors.error,
                    onTap: () => _markWord(ReviewRating.again),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _RatingButton(
                    label: 'Hard',
                    color: AppColors.orange,
                    onTap: () => _markWord(ReviewRating.hard),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _RatingButton(
                    label: 'Good',
                    color: AppColors.success,
                    onTap: () => _markWord(ReviewRating.good),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _RatingButton(
                    label: 'Easy',
                    color: AppColors.secondary,
                    onTap: () => _markWord(ReviewRating.easy),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildCardFront(String word) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.translate, size: 48, color: AppColors.secondary),
          const SizedBox(height: 24),
          Text(word, style: AppTextStyles.heading1),
          const SizedBox(height: 12),
          Text('Tap to flip', style: AppTextStyles.caption),
        ],
      ),
    );
  }

  Widget _buildCardBack(String translation, String? example) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lightbulb, size: 48, color: AppColors.primary),
          const SizedBox(height: 24),
          Text(
            translation,
            style:
                AppTextStyles.heading1.copyWith(color: AppColors.primaryDark),
          ),
          if (example != null && example.isNotEmpty) ...[
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                '"$example"',
                textAlign: TextAlign.center,
                style: AppTextStyles.body.copyWith(
                  fontStyle: FontStyle.italic,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCompletedView(state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.gold.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.emoji_events,
                size: 72,
                color: AppColors.gold,
              ),
            ),
            const SizedBox(height: 32),
            Text('Session Complete!', style: AppTextStyles.heading1),
            const SizedBox(height: 16),
            Text(
              'You reviewed ${state.totalWords} words',
              style: AppTextStyles.body,
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ResultChip(
                  icon: Icons.check_circle,
                  label: 'Known',
                  value: '${state.knownCount}',
                  color: AppColors.success,
                ),
                const SizedBox(width: 24),
                _ResultChip(
                  icon: Icons.cancel,
                  label: 'Review',
                  value: '${state.unknownCount}',
                  color: AppColors.error,
                ),
              ],
            ),
            const SizedBox(height: 48),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => context.pop(),
                child: const Text('Back to Home'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  ref.read(learningProvider.notifier).loadDailyWords();
                },
                child: const Text('Practice Again'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RatingButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _RatingButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color, width: 2),
        ),
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.bodyBold.copyWith(color: color),
          ),
        ),
      ),
    );
  }
}

class _ResultChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _ResultChip({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        const SizedBox(height: 8),
        Text(value, style: AppTextStyles.heading2.copyWith(color: color)),
        Text(label, style: AppTextStyles.caption),
      ],
    );
  }
}
