import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/core/utils/validators.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/models/my_decks_state.dart';
import 'package:englishflow/features/decks/providers/my_decks_provider.dart';
import 'package:englishflow/features/words/models/word_model.dart';
import 'package:englishflow/shared/widgets/app_button.dart';
import 'package:englishflow/shared/widgets/app_text_field.dart';
import 'package:englishflow/shared/widgets/loading_widget.dart';
import 'package:englishflow/shared/widgets/error_widget.dart';
import 'package:englishflow/shared/widgets/empty_state_widget.dart';
import 'package:englishflow/shared/widgets/speak_button.dart';

class DeckDetailScreen extends ConsumerStatefulWidget {
  final DeckModel deck;

  const DeckDetailScreen({super.key, required this.deck});

  @override
  ConsumerState<DeckDetailScreen> createState() => _DeckDetailScreenState();
}

class _DeckDetailScreenState extends ConsumerState<DeckDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(myDecksProvider.notifier).loadDeck(widget.deck.id),
    );
  }

  bool get _canEdit => widget.deck.isOwner;

  Future<void> _openAddWord() async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _AddWordSheet(deckId: widget.deck.id),
    );
    if (added == true && mounted) {
      SnackbarUtils.showSuccess(context, 'Word added!');
    }
  }

  Future<void> _removeWord(WordModel word) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Word'),
        content: Text('Remove "${word.word}" from this deck?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final success = await ref
        .read(myDecksProvider.notifier)
        .removeWordFromDeck(widget.deck.id, word.id);
    if (!mounted) return;
    if (success) {
      SnackbarUtils.showSuccess(context, 'Word removed');
    } else {
      final error = ref.read(myDecksProvider).deckError;
      SnackbarUtils.showError(context, error ?? 'Failed to remove word');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(myDecksProvider);
    // Prefer the freshly loaded deck; fall back to the one passed in.
    final deck = state.currentDeck?.id == widget.deck.id
        ? state.currentDeck!
        : widget.deck;

    return Scaffold(
      appBar: AppBar(
        title: Text(deck.title, style: AppTextStyles.heading2),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      floatingActionButton: _canEdit
          ? FloatingActionButton.extended(
              onPressed: state.isMutatingWords ? null : _openAddWord,
              icon: const Icon(Icons.add),
              label: const Text('Add Word'),
            )
          : null,
      body: _buildBody(state, deck),
    );
  }

  Widget _buildBody(MyDecksState state, DeckModel deck) {
    if (state.isLoadingDeck && state.currentDeck?.id != deck.id) {
      return const LoadingWidget(message: 'Loading deck...');
    }

    if (state.deckError != null && state.currentDeck?.id != deck.id) {
      return AppErrorWidget(
        message: state.deckError!,
        onRetry: () =>
            ref.read(myDecksProvider.notifier).loadDeck(widget.deck.id),
      );
    }

    if (deck.words.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.book_outlined,
        title: 'No words yet',
        subtitle: _canEdit
            ? 'Add words to build this deck.'
            : 'This deck has no words.',
        buttonText: _canEdit ? 'Add Word' : null,
        onButtonPressed: _canEdit ? _openAddWord : null,
      );
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(myDecksProvider.notifier).loadDeck(widget.deck.id),
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
        itemCount: deck.words.length,
        itemBuilder: (context, index) {
          final word = deck.words[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              title: Text(word.word, style: AppTextStyles.bodyBold),
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
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SpeakButton(word: word.word, audioUrl: word.audioUrl),
                  if (_canEdit)
                    IconButton(
                      icon: const Icon(
                        Icons.delete_outline,
                        color: AppColors.textHint,
                      ),
                      tooltip: 'Remove word',
                      onPressed: state.isMutatingWords
                          ? null
                          : () => _removeWord(word),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _AddWordSheet extends ConsumerStatefulWidget {
  final String deckId;

  const _AddWordSheet({required this.deckId});

  @override
  ConsumerState<_AddWordSheet> createState() => _AddWordSheetState();
}

class _AddWordSheetState extends ConsumerState<_AddWordSheet> {
  final _formKey = GlobalKey<FormState>();
  final _wordController = TextEditingController();
  final _translationController = TextEditingController();
  final _exampleController = TextEditingController();

  @override
  void dispose() {
    _wordController.dispose();
    _translationController.dispose();
    _exampleController.dispose();
    super.dispose();
  }

  Future<void> _handleAdd() async {
    if (!_formKey.currentState!.validate()) return;

    final example = _exampleController.text.trim();
    final success =
        await ref.read(myDecksProvider.notifier).addWordsToDeck(widget.deckId, [
      {
        'word': _wordController.text.trim(),
        'translation': _translationController.text.trim(),
        if (example.isNotEmpty) 'example': example,
      },
    ]);

    if (!mounted) return;
    if (success) {
      Navigator.pop(context, true);
    } else {
      final error = ref.read(myDecksProvider).deckError;
      SnackbarUtils.showError(context, error ?? 'Failed to add word');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(myDecksProvider);

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Add Word', style: AppTextStyles.heading2),
            const SizedBox(height: 16),
            AppTextField(
              controller: _wordController,
              label: 'English Word',
              hint: 'e.g., Apple',
              prefixIcon: Icons.abc,
              validator: (v) => Validators.required(v, 'Word'),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),
            AppTextField(
              controller: _translationController,
              label: 'Translation',
              hint: 'e.g., Olma',
              prefixIcon: Icons.translate,
              validator: (v) => Validators.required(v, 'Translation'),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),
            AppTextField(
              controller: _exampleController,
              label: 'Example Sentence (optional)',
              hint: 'e.g., I ate an apple',
              prefixIcon: Icons.format_quote,
              maxLines: 2,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _handleAdd(),
            ),
            const SizedBox(height: 24),
            AppButton(
              text: 'Add Word',
              onPressed: _handleAdd,
              isLoading: state.isMutatingWords,
              icon: Icons.add,
            ),
          ],
        ),
      ),
    );
  }
}
