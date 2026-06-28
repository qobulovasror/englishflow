import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';
import 'package:englishflow/core/utils/validators.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/providers/my_decks_provider.dart';
import 'package:englishflow/shared/widgets/app_button.dart';
import 'package:englishflow/shared/widgets/app_text_field.dart';

/// Create (when [deck] is null) or edit an existing user deck.
class DeckFormScreen extends ConsumerStatefulWidget {
  final DeckModel? deck;

  const DeckFormScreen({super.key, this.deck});

  @override
  ConsumerState<DeckFormScreen> createState() => _DeckFormScreenState();
}

class _DeckFormScreenState extends ConsumerState<DeckFormScreen> {
  static const _levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  String? _level;
  bool _isPublic = false;

  bool get _isEdit => widget.deck != null;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.deck?.title ?? '');
    _descriptionController =
        TextEditingController(text: widget.deck?.description ?? '');
    _level = widget.deck?.level;
    _isPublic = widget.deck?.isPublic ?? false;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final notifier = ref.read(myDecksProvider.notifier);
    final title = _titleController.text.trim();
    final description = _descriptionController.text.trim();

    final success = _isEdit
        ? await notifier.updateDeck(
            widget.deck!.id,
            title: title,
            description: description,
            level: _level,
            isPublic: _isPublic,
          )
        : await notifier.createDeck(
            title: title,
            description: description,
            level: _level,
            isPublic: _isPublic,
          );

    if (!mounted) return;
    if (success) {
      SnackbarUtils.showSuccess(
        context,
        _isEdit ? 'Deck updated!' : 'Deck created!',
      );
      context.pop();
    } else {
      final error = ref.read(myDecksProvider).error;
      SnackbarUtils.showError(context, error ?? 'Failed to save deck');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(myDecksProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _isEdit ? 'Edit Deck' : 'New Deck',
          style: AppTextStyles.heading2,
        ),
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
                controller: _titleController,
                label: 'Title',
                hint: 'e.g., Travel vocabulary',
                prefixIcon: Icons.title,
                validator: (v) => Validators.required(v, 'Title'),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _descriptionController,
                label: 'Description (optional)',
                hint: 'What is this deck about?',
                prefixIcon: Icons.notes,
                maxLines: 2,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String?>(
                initialValue: _level,
                decoration: const InputDecoration(
                  labelText: 'Level (optional)',
                  prefixIcon: Icon(Icons.signal_cellular_alt),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('None')),
                  for (final lvl in _levels)
                    DropdownMenuItem(value: lvl, child: Text(lvl)),
                ],
                onChanged: (v) => setState(() => _level = v),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Public'),
                subtitle: const Text('Let others discover this deck'),
                value: _isPublic,
                onChanged: (v) => setState(() => _isPublic = v),
              ),
              const SizedBox(height: 24),
              AppButton(
                text: _isEdit ? 'Save Changes' : 'Create Deck',
                onPressed: _handleSave,
                isLoading: state.isSaving,
                icon: _isEdit ? Icons.check : Icons.add,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
