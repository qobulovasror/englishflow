import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/core/utils/validators.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/words/models/word_model.dart';
import 'package:englishflow/features/words/providers/words_provider.dart';
import 'package:englishflow/shared/widgets/app_button.dart';
import 'package:englishflow/shared/widgets/app_text_field.dart';

class EditWordScreen extends ConsumerStatefulWidget {
  final WordModel word;

  const EditWordScreen({super.key, required this.word});

  @override
  ConsumerState<EditWordScreen> createState() => _EditWordScreenState();
}

class _EditWordScreenState extends ConsumerState<EditWordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _wordController;
  late final TextEditingController _translationController;
  late final TextEditingController _exampleController;

  @override
  void initState() {
    super.initState();
    _wordController = TextEditingController(text: widget.word.word);
    _translationController =
        TextEditingController(text: widget.word.translation);
    _exampleController =
        TextEditingController(text: widget.word.example ?? '');
  }

  @override
  void dispose() {
    _wordController.dispose();
    _translationController.dispose();
    _exampleController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(wordsProvider.notifier).updateWord(
          widget.word.id,
          word: _wordController.text.trim(),
          translation: _translationController.text.trim(),
          example: _exampleController.text.trim(),
        );

    if (!mounted) return;
    if (success) {
      SnackbarUtils.showSuccess(context, 'Word updated!');
      context.pop();
    } else {
      SnackbarUtils.showError(context, 'Failed to update word');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(wordsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Edit Word', style: AppTextStyles.heading2),
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
                onSubmitted: (_) => _handleSave(),
              ),
              const SizedBox(height: 32),
              AppButton(
                text: 'Save Changes',
                onPressed: _handleSave,
                isLoading: state.isUpdating,
                icon: Icons.check,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
