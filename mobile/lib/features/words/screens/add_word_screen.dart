import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/core/utils/validators.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/words/providers/words_provider.dart';
import 'package:englishflow/shared/widgets/app_button.dart';
import 'package:englishflow/shared/widgets/app_text_field.dart';

class AddWordScreen extends ConsumerStatefulWidget {
  const AddWordScreen({super.key});

  @override
  ConsumerState<AddWordScreen> createState() => _AddWordScreenState();
}

class _AddWordScreenState extends ConsumerState<AddWordScreen> {
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

    final success = await ref.read(wordsProvider.notifier).addWord(
          word: _wordController.text.trim(),
          translation: _translationController.text.trim(),
          example: _exampleController.text.trim(),
        );

    if (!mounted) return;
    if (success) {
      SnackbarUtils.showSuccess(context, 'Word added!');
      context.pop();
    } else {
      SnackbarUtils.showError(context, 'Failed to add word');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(wordsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Add Word', style: AppTextStyles.heading2),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
              const SizedBox(height: 32),
              AppButton(
                text: 'Add Word',
                onPressed: _handleAdd,
                isLoading: state.isAdding,
                icon: Icons.add,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
