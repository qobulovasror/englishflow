import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/features/progress/models/progress_model.dart';

void main() {
  group('StreakInfo', () {
    test('parses fields from json', () {
      final s = StreakInfo.fromJson({
        'current': 5,
        'longest': 9,
        'todayCount': 3,
        'dailyGoal': 10,
        'goalMet': false,
      });
      expect(s.current, 5);
      expect(s.longest, 9);
      expect(s.todayCount, 3);
      expect(s.dailyGoal, 10);
      expect(s.goalMet, isFalse);
    });

    test('applies defaults for missing fields', () {
      final s = StreakInfo.fromJson({});
      expect(s.current, 0);
      expect(s.dailyGoal, 0);
      expect(s.goalMet, isFalse);
    });

    test('goalProgress is the clamped fraction of the goal', () {
      expect(const StreakInfo(todayCount: 3, dailyGoal: 10).goalProgress, 0.3);
    });

    test('goalProgress is 0 when the goal is 0 (no div-by-zero)', () {
      expect(const StreakInfo(todayCount: 5, dailyGoal: 0).goalProgress, 0.0);
    });

    test('goalProgress is clamped to 1.0 when over the goal', () {
      expect(const StreakInfo(todayCount: 20, dailyGoal: 10).goalProgress, 1.0);
    });
  });

  group('ProgressStats.fromJson', () {
    test('reads nested vocabulary/tests/streak envelopes', () {
      final stats = ProgressStats.fromJson({
        'vocabulary': {
          'total': 40,
          'new': 10,
          'learning': 20,
          'learned': 10,
          'progressPercentage': 25,
        },
        'tests': {'total': 4, 'averageScore': 87.5},
        'streak': {'current': 2, 'dailyGoal': 5},
      });

      expect(stats.totalWords, 40);
      expect(stats.learningWords, 20);
      expect(stats.progressPercentage, 25);
      expect(stats.totalTests, 4);
      expect(stats.averageScore, 87.5);
      expect(stats.streak.current, 2);
    });

    test('falls back to a default streak when absent', () {
      final stats = ProgressStats.fromJson({});
      expect(stats.totalWords, 0);
      expect(stats.streak, const StreakInfo());
    });

    test('coerces an integer averageScore to double', () {
      final stats = ProgressStats.fromJson({
        'tests': {'averageScore': 90},
      });
      expect(stats.averageScore, 90.0);
    });
  });

  group('TrendPoint.fromJson', () {
    test('parses date and count', () {
      final t = TrendPoint.fromJson({'date': '2026-06-29', 'count': 7});
      expect(t.date, '2026-06-29');
      expect(t.count, 7);
    });

    test('defaults count to 0 and stringifies a missing date', () {
      final t = TrendPoint.fromJson({});
      expect(t.date, '');
      expect(t.count, 0);
    });
  });

  group('DeckProgress.fromJson', () {
    test('maps the "new" key onto newWords and coerces numbers', () {
      final d = DeckProgress.fromJson({
        'id': 7,
        'title': 'Phrasals',
        'level': 'B1',
        'isSystem': true,
        'total': 30,
        'new': 5,
        'learning': 15,
        'learned': 10,
        'progressPercentage': 33,
      });
      expect(d.id, '7');
      expect(d.title, 'Phrasals');
      expect(d.level, 'B1');
      expect(d.isSystem, isTrue);
      expect(d.newWords, 5);
      expect(d.learning, 15);
      expect(d.progressPercentage, 33);
    });

    test('isSystem is false unless json is exactly true', () {
      expect(DeckProgress.fromJson({'id': '1', 'title': 'x'}).isSystem, isFalse);
      expect(
        DeckProgress.fromJson({'id': '1', 'title': 'x', 'isSystem': 'true'})
            .isSystem,
        isFalse,
      );
    });
  });

  group('Leech.fromJson', () {
    test('parses lapses and optional fields', () {
      final l = Leech.fromJson({
        'wordId': 'w9',
        'word': 'though',
        'translation': 'garchi',
        'lapses': 6,
        'status': 'LEARNING',
        'lastReviewedAt': '2026-06-20',
      });
      expect(l.wordId, 'w9');
      expect(l.word, 'though');
      expect(l.translation, 'garchi');
      expect(l.lapses, 6);
      expect(l.status, 'LEARNING');
      expect(l.lastReviewedAt, '2026-06-20');
    });

    test('defaults optional fields', () {
      final l = Leech.fromJson({'wordId': 'w1', 'word': 'a'});
      expect(l.translation, '');
      expect(l.lapses, 0);
      expect(l.status, isNull);
    });
  });
}
