import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/providers/my_decks_provider.dart';
import 'package:englishflow/shared/widgets/loading_widget.dart';
import 'package:englishflow/shared/widgets/error_widget.dart';
import 'package:englishflow/shared/widgets/empty_state_widget.dart';

class MyDecksScreen extends ConsumerStatefulWidget {
  const MyDecksScreen({super.key});

  @override
  ConsumerState<MyDecksScreen> createState() => _MyDecksScreenState();
}

class _MyDecksScreenState extends ConsumerState<MyDecksScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(myDecksProvider.notifier).loadMyDecks());
  }

  Future<void> _confirmDelete(DeckModel deck) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Deck'),
        content: Text('Delete "${deck.title}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final success =
        await ref.read(myDecksProvider.notifier).deleteDeck(deck.id);
    if (!mounted) return;
    if (success) {
      SnackbarUtils.showSuccess(context, 'Deck deleted');
    } else {
      final error = ref.read(myDecksProvider).error;
      SnackbarUtils.showError(context, error ?? 'Failed to delete deck');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(myDecksProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('My Decks', style: AppTextStyles.heading2),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/deck-form'),
        icon: const Icon(Icons.add),
        label: const Text('New Deck'),
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(state) {
    if (state.isLoading) {
      return const LoadingWidget(message: 'Loading your decks...');
    }

    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(myDecksProvider.notifier).loadMyDecks(),
      );
    }

    if (state.decks.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.style_outlined,
        title: 'No decks yet',
        subtitle: 'Create your own deck to organize words.',
        buttonText: 'Create Deck',
        onButtonPressed: () => context.push('/deck-form'),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(myDecksProvider.notifier).loadMyDecks(),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.decks.length,
        itemBuilder: (context, index) {
          final deck = state.decks[index];
          return _DeckCard(
            deck: deck,
            onTap: () => context.push('/deck-detail', extra: deck),
            onEdit: deck.isOwner
                ? () => context.push('/deck-form', extra: deck)
                : null,
            onDelete: deck.isOwner ? () => _confirmDelete(deck) : null,
          );
        },
      ),
    );
  }
}

class _DeckCard extends StatelessWidget {
  final DeckModel deck;
  final VoidCallback onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  const _DeckCard({
    required this.deck,
    required this.onTap,
    this.onEdit,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        title: Row(
          children: [
            Flexible(child: Text(deck.title, style: AppTextStyles.bodyBold)),
            if (deck.isSystem) ...[
              const SizedBox(width: 8),
              const _Tag(label: 'System'),
            ] else if (deck.isPublic) ...[
              const SizedBox(width: 8),
              const _Tag(label: 'Public'),
            ],
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            '${deck.wordCount} words · ${deck.level ?? '—'}',
            style: AppTextStyles.caption,
          ),
        ),
        onTap: onTap,
        trailing: !deck.isOwner
            ? const Icon(Icons.lock_outline, color: AppColors.textHint)
            : PopupMenuButton<String>(
                onSelected: (value) {
                  if (value == 'edit') onEdit?.call();
                  if (value == 'delete') onDelete?.call();
                },
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'edit', child: Text('Edit')),
                  PopupMenuItem(value: 'delete', child: Text('Delete')),
                ],
              ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  const _Tag({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.primaryDark,
        ),
      ),
    );
  }
}
