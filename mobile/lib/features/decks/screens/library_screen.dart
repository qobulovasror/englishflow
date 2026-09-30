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
  String? _copyingId;
  final _searchController = TextEditingController();
  final _topicController = TextEditingController();
  final _goalController = TextEditingController();
  String _sort = 'popular';

  static const _levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final decks = await ref.read(decksServiceProvider).list(
            level: _level,
            search: _searchController.text.trim(),
            topic: _topicController.text.trim().toLowerCase(),
            learningGoal: _goalController.text.trim(),
            sort: _sort,
          );
      setState(() => _decks = decks);
    } catch (e) {
      if (mounted) SnackbarUtils.showError(context, e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _copy(DeckModel deck) async {
    setState(() => _copyingId = deck.id);
    try {
      await ref.read(decksServiceProvider).copy(deck.id);
      if (mounted) SnackbarUtils.showSuccess(context, 'Copied to My Decks');
    } catch (e) {
      if (mounted) SnackbarUtils.showError(context, e.toString());
    } finally {
      if (mounted) setState(() => _copyingId = null);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _topicController.dispose();
    _goalController.dispose();
    super.dispose();
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
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    labelText: 'Search decks',
                    suffixIcon: IconButton(
                        icon: const Icon(Icons.search), onPressed: _load),
                  ),
                  onSubmitted: (_) => _load(),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                        child: TextField(
                            controller: _topicController,
                            decoration:
                                const InputDecoration(labelText: 'Topic tag'))),
                    const SizedBox(width: 8),
                    Expanded(
                        child: TextField(
                            controller: _goalController,
                            decoration: const InputDecoration(
                                labelText: 'Learning goal'))),
                  ],
                ),
                Row(
                  children: [
                    const Text('Sort'),
                    const SizedBox(width: 12),
                    DropdownButton<String>(
                      value: _sort,
                      items: const [
                        DropdownMenuItem(
                            value: 'popular', child: Text('Popular')),
                        DropdownMenuItem(
                            value: 'newest', child: Text('Newest')),
                        DropdownMenuItem(
                            value: 'title', child: Text('Title A–Z')),
                        DropdownMenuItem(
                            value: 'content', child: Text('Most words')),
                        DropdownMenuItem(
                            value: 'quality', child: Text('Curator score')),
                      ],
                      onChanged: (value) {
                        if (value != null) setState(() => _sort = value);
                      },
                    ),
                    const Spacer(),
                    TextButton(
                        onPressed: _load, child: const Text('Apply filters')),
                  ],
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
                              subtitle: Text([
                                '${deck.wordCount} words · ${deck.level ?? '—'}',
                                if (deck.learningGoal?.isNotEmpty == true)
                                  deck.learningGoal!,
                                if (deck.topics.isNotEmpty)
                                  deck.topics.join(', '),
                                if (deck.qualityScore > 0)
                                  'Quality ${deck.qualityScore}/100',
                              ].join(' · ')),
                              trailing: Wrap(
                                spacing: 4,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  if (!deck.isOwner)
                                    IconButton(
                                      tooltip: 'Copy to My Decks',
                                      onPressed: _copyingId == deck.id
                                          ? null
                                          : () => _copy(deck),
                                      icon: _copyingId == deck.id
                                          ? const SizedBox(
                                              height: 18,
                                              width: 18,
                                              child: CircularProgressIndicator(
                                                  strokeWidth: 2))
                                          : const Icon(Icons.copy_outlined),
                                    ),
                                  if (deck.isEnrolled)
                                    const Text('✓ Joined',
                                        style: TextStyle(
                                            color: AppColors.success,
                                            fontWeight: FontWeight.w600))
                                  else if (_enrollingId == deck.id)
                                    const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  else
                                    FilledButton(
                                      onPressed: () => _enroll(deck),
                                      child: const Text('Join'),
                                    ),
                                ],
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
