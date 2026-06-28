import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/services/decks_service.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  List<DeckModel> _decks = [];
  bool _loading = true;
  String? _level;
  String? _enrollingId;

  static const _levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final decks = await ref.read(decksServiceProvider).list(level: _level);
      setState(() => _decks = decks);
    } catch (e) {
      if (mounted) SnackbarUtils.showError(context, e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _enroll(DeckModel deck) async {
    setState(() => _enrollingId = deck.id);
    try {
      final count = await ref.read(decksServiceProvider).enroll(deck.id);
      setState(() {
        final i = _decks.indexWhere((d) => d.id == deck.id);
        if (i != -1) _decks[i] = _decks[i].copyWith(isEnrolled: true);
      });
      if (mounted) {
        SnackbarUtils.showSuccess(context, '$count words added to your list');
      }
    } catch (e) {
      if (mounted) SnackbarUtils.showError(context, e.toString());
    } finally {
      if (mounted) setState(() => _enrollingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Library'),
        actions: [
          IconButton(
            onPressed: () => context.push('/my-decks'),
            icon: const Icon(Icons.style_outlined),
            tooltip: 'My decks',
          ),
        ],
      ),
      body: Column(
        children: [
          SizedBox(
            height: 56,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                _LevelChip(
                  label: 'All',
                  selected: _level == null,
                  onTap: () {
                    setState(() => _level = null);
                    _load();
                  },
                ),
                for (final lvl in _levels)
                  _LevelChip(
                    label: lvl,
                    selected: _level == lvl,
                    onTap: () {
                      setState(() => _level = lvl);
                      _load();
                    },
                  ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _decks.isEmpty
                    ? const Center(child: Text('No decks found.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _decks.length,
                        itemBuilder: (context, i) {
                          final deck = _decks[i];
                          return Card(
                            child: ListTile(
                              title: Text(deck.title),
                              subtitle: Text(
                                '${deck.wordCount} words · ${deck.level ?? '—'}',
                              ),
                              trailing: deck.isEnrolled
                                  ? const Text('✓ Joined',
                                      style: TextStyle(
                                          color: AppColors.success,
                                          fontWeight: FontWeight.w600))
                                  : _enrollingId == deck.id
                                      ? const SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                              strokeWidth: 2),
                                        )
                                      : FilledButton(
                                          onPressed: () => _enroll(deck),
                                          child: const Text('Join'),
                                        ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _LevelChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _LevelChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: AppColors.primaryLight,
      ),
    );
  }
}
