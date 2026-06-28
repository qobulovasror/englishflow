import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/auth/providers/auth_provider.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/services/decks_service.dart';

const _levels = <MapEntry<String, String>>[
  MapEntry('A1', 'Beginner'),
  MapEntry('A2', 'Elementary'),
  MapEntry('B1', 'Intermediate'),
  MapEntry('B2', 'Upper-intermediate'),
  MapEntry('C1', 'Advanced'),
  MapEntry('C2', 'Proficient'),
];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _step = 1;
  String? _level;
  List<DeckModel> _decks = [];
  final Set<String> _selected = {};
  bool _loadingDecks = false;
  bool _submitting = false;

  Future<void> _chooseLevel(String level) async {
    setState(() {
      _level = level;
      _step = 2;
      _loadingDecks = true;
    });
    try {
      final service = ref.read(decksServiceProvider);
      var decks = await service.list(level: level);
      if (decks.isEmpty) decks = await service.list();
      setState(() => _decks = decks);
    } catch (_) {
      if (mounted) {
        SnackbarUtils.showError(context, 'Could not load decks. You can skip.');
      }
    } finally {
      if (mounted) setState(() => _loadingDecks = false);
    }
  }

  Future<void> _finish({required bool skip}) async {
    setState(() => _submitting = true);
    try {
      await ref.read(authProvider.notifier).completeOnboarding(
            level: skip ? null : _level,
            deckIds: skip ? const [] : _selected.toList(),
          );
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) SnackbarUtils.showError(context, e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_step == 1 ? 'Your level' : 'Pick decks'),
        leading: _step == 2
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _step = 1),
              )
            : null,
        actions: [
          TextButton(
            onPressed: _submitting ? null : () => _finish(skip: true),
            child: const Text('Skip'),
          ),
        ],
      ),
      body: _step == 1 ? _buildLevelStep() : _buildDeckStep(),
    );
  }

  Widget _buildLevelStep() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.count(
        crossAxisCount: 2,
        childAspectRatio: 2.2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        children: [
          for (final lvl in _levels)
            OutlinedButton(
              onPressed: () => _chooseLevel(lvl.key),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(lvl.key,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  Text(lvl.value,
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDeckStep() {
    if (_loadingDecks) {
      return const Center(child: CircularProgressIndicator());
    }
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _decks.length,
            itemBuilder: (context, i) {
              final deck = _decks[i];
              final checked = _selected.contains(deck.id);
              return Card(
                child: CheckboxListTile(
                  value: checked,
                  activeColor: AppColors.primary,
                  title: Text(deck.title),
                  subtitle: Text('${deck.wordCount} words · ${deck.level ?? '—'}'),
                  onChanged: (_) => setState(() {
                    checked ? _selected.remove(deck.id) : _selected.add(deck.id);
                  }),
                ),
              );
            },
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _selected.isEmpty || _submitting
                    ? null
                    : () => _finish(skip: false),
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text('Start learning (${_selected.length})'),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
