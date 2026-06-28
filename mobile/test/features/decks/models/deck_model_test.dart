import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';

void main() {
  group('DeckModel.fromJson', () {
    test('parses scalar fields and boolean flags', () {
      final deck = DeckModel.fromJson({
        'id': 'd1',
        'title': 'Travel',
        'description': 'On the road',
        'level': 'A2',
        'isSystem': true,
        'isPublic': true,
        'wordCount': 12,
        'isEnrolled': true,
      });

      expect(deck.id, 'd1');
      expect(deck.title, 'Travel');
      expect(deck.description, 'On the road');
      expect(deck.level, 'A2');
      expect(deck.isSystem, isTrue);
      expect(deck.isPublic, isTrue);
      expect(deck.wordCount, 12);
      expect(deck.isEnrolled, isTrue);
      expect(deck.words, isEmpty);
    });

    test('derives wordCount from words when not given', () {
      final deck = DeckModel.fromJson({
        'id': 'd2',
        'title': 'Food',
        'words': [
          {'id': 'w1', 'word': 'apple', 'translation': 'olma'},
          {'id': 'w2', 'word': 'bread', 'translation': 'non'},
        ],
      });

      expect(deck.words.length, 2);
      expect(deck.words.first.word, 'apple');
      expect(deck.wordCount, 2);
    });

    test('explicit wordCount overrides the derived count', () {
      final deck = DeckModel.fromJson({
        'id': 'd3',
        'title': 'Big',
        'wordCount': 99,
        'words': [
          {'id': 'w1', 'word': 'x', 'translation': 'y'},
        ],
      });
      expect(deck.wordCount, 99);
    });

    test('boolean flags default to false unless exactly true', () {
      final deck = DeckModel.fromJson({
        'id': 'd4',
        'title': 'X',
        'isSystem': 'true',
        'isPublic': 1,
      });
      expect(deck.isSystem, isFalse);
      expect(deck.isPublic, isFalse);
      expect(deck.isEnrolled, isFalse);
    });
  });

  group('DeckModel.copyWith', () {
    test('overrides only the supplied fields and preserves id/isSystem', () {
      const original = DeckModel(
        id: 'd1',
        title: 'Old',
        isSystem: true,
        wordCount: 3,
      );

      final updated = original.copyWith(title: 'New', wordCount: 5);

      expect(updated.id, 'd1'); // id is never copied over
      expect(updated.isSystem, isTrue); // isSystem preserved
      expect(updated.title, 'New');
      expect(updated.wordCount, 5);
    });

    test('returns an equatable-equal value when nothing changes', () {
      const original = DeckModel(id: 'd1', title: 'Same');
      expect(original.copyWith(), original);
    });
  });
}
