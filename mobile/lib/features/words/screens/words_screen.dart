import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/words/providers/words_provider.dart';
import 'package:englishflow/shared/widgets/loading_widget.dart';
import 'package:englishflow/shared/widgets/error_widget.dart';
import 'package:englishflow/shared/widgets/empty_state_widget.dart';
import 'package:englishflow/shared/widgets/speak_button.dart';

class WordsScreen extends ConsumerStatefulWidget {
  const WordsScreen({super.key});

  @override
  ConsumerState<WordsScreen> createState() => _WordsScreenState();
}

class _WordsScreenState extends ConsumerState<WordsScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(wordsProvider.notifier).loadWords());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  // Fetch the next page as the list nears the bottom (infinite scroll). The
  // provider guards against overlapping loads / the last page.
  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final pos = _scrollController.position;
    if (pos.pixels >= pos.maxScrollExtent - 300) {
      ref.read(wordsProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(wordsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('My Words', style: AppTextStyles.heading2),
        actions: [
          IconButton(
            onPressed: () => context.push('/library'),
            icon: const Icon(Icons.library_books_outlined),
            tooltip: 'Browse decks',
          ),
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              onPressed: () => context.push('/add-word'),
              icon: const Icon(Icons.add, color: AppColors.primary),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterBar(state),
          Expanded(child: _buildBody(state)),
        ],
      ),
    );
  }

  static const _filters = <(String, String?)>[
    ('All', null),
    ('New', 'NEW'),
    ('Learning', 'LEARNING'),
    ('Learned', 'LEARNED'),
  ];

  Widget _buildFilterBar(state) {
    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        children: [
          for (final (label, value) in _filters)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(label),
                selected: state.statusFilter == value,
                onSelected: (_) =>
                    ref.read(wordsProvider.notifier).setStatusFilter(value),
                selectedColor: AppColors.primaryLight,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBody(state) {
    if (state.isLoading) {
      return const LoadingWidget(message: 'Loading words...');
    }

    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(wordsProvider.notifier).loadWords(),
      );
    }

    if (state.words.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.book_outlined,
        title: 'No words yet',
        subtitle: 'Start building your vocabulary!',
        buttonText: 'Add First Word',
        onButtonPressed: () => context.push('/add-word'),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(wordsProvider.notifier).loadWords(),
      color: AppColors.primary,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: state.words.length + (state.hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          // Footer row while more pages exist: shows a spinner as they load.
          if (index >= state.words.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          final word = state.words[index];
          return Dismissible(
            key: Key(word.id),
            direction: DismissDirection.endToStart,
            background: Container(
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: 20),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.delete, color: Colors.white),
            ),
            confirmDismiss: (direction) async {
              return await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Delete Word'),
                  content: Text('Delete "${word.word}"?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.error,
                      ),
                      child: const Text('Delete'),
                    ),
                  ],
                ),
              );
            },
            onDismissed: (direction) async {
              final success =
                  await ref.read(wordsProvider.notifier).deleteWord(word.id);
              if (mounted) {
                if (success) {
                  SnackbarUtils.showSuccess(context, 'Word deleted');
                } else {
                  SnackbarUtils.showError(context, 'Failed to delete word');
                }
              }
            },
            child: Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                title: Text(
                  word.word,
                  style: AppTextStyles.bodyBold,
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 4),
                    Text(word.translation, style: AppTextStyles.caption),
                    if (word.example != null && word.example!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        '"${word.example}"',
                        style: AppTextStyles.caption.copyWith(
                          fontStyle: FontStyle.italic,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
                onTap: () => context.push('/edit-word', extra: word),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SpeakButton(word: word.word, audioUrl: word.audioUrl),
                    IconButton(
                      icon: const Icon(
                        Icons.edit_outlined,
                        color: AppColors.textHint,
                      ),
                      tooltip: 'Edit word',
                      onPressed: () => context.push('/edit-word', extra: word),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
