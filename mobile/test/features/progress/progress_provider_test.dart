import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/features/progress/models/progress_model.dart';
import 'package:englishflow/features/progress/providers/progress_provider.dart';
import 'package:englishflow/features/progress/services/progress_service.dart';

class _FakeProgressService implements ProgressService {
  ProgressStats stats;
  List<TrendPoint> trends;
  List<DeckProgress> decks;
  List<Leech> leeches;
  bool shouldThrow;
  int? lastTrendDays;

  _FakeProgressService({
    this.stats = const ProgressStats(),
    this.trends = const [],
    this.decks = const [],
    this.leeches = const [],
    this.shouldThrow = false,
  });

  @override
  Future<ProgressStats> getProgress() async {
    if (shouldThrow) throw Exception('boom');
    return stats;
  }

  @override
  Future<List<TrendPoint>> getTrends({int days = 30}) async {
    lastTrendDays = days;
    if (shouldThrow) throw Exception('boom');
    return trends;
  }

  @override
  Future<List<DeckProgress>> getDeckProgress() async {
    if (shouldThrow) throw Exception('boom');
    return decks;
  }

  @override
  Future<List<Leech>> getLeeches() async {
    if (shouldThrow) throw Exception('boom');
    return leeches;
  }
}

void main() {
  group('ProgressNotifier loaders', () {
    test('loadProgress fans out and populates every section', () async {
      final notifier = ProgressNotifier(_FakeProgressService(
        stats: const ProgressStats(totalWords: 12),
        trends: const [TrendPoint(date: '2026-06-01', count: 3)],
        decks: const [DeckProgress(id: 'd1', title: 'A')],
        leeches: const [Leech(wordId: 'w1', word: 'hard')],
      ));

      await notifier.loadProgress();

      final s = notifier.state;
      expect(s.stats?.totalWords, 12);
      expect(s.trends.single.count, 3);
      expect(s.decks.single.id, 'd1');
      expect(s.leeches.single.word, 'hard');
      expect(s.isLoading, isFalse);
      expect(s.trendsLoading, isFalse);
      expect(s.decksLoading, isFalse);
      expect(s.leechesLoading, isFalse);
    });

    test('loadTrends records the requested window', () async {
      final fake = _FakeProgressService(
        trends: const [TrendPoint(date: '2026-06-02', count: 5)],
      );
      final notifier = ProgressNotifier(fake);

      await notifier.loadTrends(days: 7);

      expect(notifier.state.trendDays, 7);
      expect(fake.lastTrendDays, 7);
      expect(notifier.state.trends.single.count, 5);
      expect(notifier.state.trendsLoading, isFalse);
    });

    test('each section records its own error independently', () async {
      final notifier = ProgressNotifier(_FakeProgressService(shouldThrow: true));

      await notifier.loadProgress();

      final s = notifier.state;
      expect(s.error, contains('boom'));
      expect(s.trendsError, contains('boom'));
      expect(s.decksError, contains('boom'));
      expect(s.leechesError, contains('boom'));
    });

    test('loadLeeches populates only the leeches field', () async {
      final notifier = ProgressNotifier(_FakeProgressService(
        leeches: const [Leech(wordId: 'w1', word: 'tricky', lapses: 4)],
      ));

      await notifier.loadLeeches();

      expect(notifier.state.leeches.single.lapses, 4);
      expect(notifier.state.leechesLoading, isFalse);
      expect(notifier.state.stats, isNull); // untouched
    });
  });
}
