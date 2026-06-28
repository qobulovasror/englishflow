import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/providers/my_decks_provider.dart';
import 'package:englishflow/features/decks/services/decks_service.dart';

/// Hand-written fake implementing the public surface the notifier uses.
class _FakeDecksService implements DecksService {
  List<DeckModel> myDecks;
  DeckModel? deck;
  bool shouldThrow;

  _FakeDecksService({
    this.myDecks = const [],
    this.deck,
    this.shouldThrow = false,
  });

  @override
  Future<List<DeckModel>> getMyDecks() async {
    if (shouldThrow) throw Exception('boom');
    return myDecks;
  }

  @override
  Future<DeckModel> createDeck({
    required String title,
    String? description,
    String? level,
    bool? isPublic,
  }) async {
    if (shouldThrow) throw Exception('boom');
    return DeckModel(
      id: 'created',
      title: title,
      description: description,
      level: level,
      isPublic: isPublic ?? false,
    );
  }

  @override
  Future<DeckModel> updateDeck(
    String id, {
    String? title,
    String? description,
    String? level,
    bool? isPublic,
  }) async {
    if (shouldThrow) throw Exception('boom');
    return DeckModel(id: id, title: title ?? 'unchanged');
  }

  @override
  Future<void> deleteDeck(String id) async {
    if (shouldThrow) throw Exception('boom');
  }

  @override
  Future<DeckModel> getDeck(String id) async {
    if (shouldThrow) throw Exception('boom');
    return deck ?? DeckModel(id: id, title: 'loaded');
  }

  // Unused by these tests.
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

const _deck = DeckModel(id: 'd1', title: 'Travel');

void main() {
  group('MyDecksNotifier.loadMyDecks', () {
    test('populates decks on success', () async {
      final notifier =
          MyDecksNotifier(_FakeDecksService(myDecks: const [_deck]));

      await notifier.loadMyDecks();

      expect(notifier.state.decks, const [_deck]);
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
    });

    test('sets error on failure', () async {
      final notifier = MyDecksNotifier(_FakeDecksService(shouldThrow: true));

      await notifier.loadMyDecks();

      expect(notifier.state.error, contains('boom'));
      expect(notifier.state.isLoading, isFalse);
    });
  });

  group('MyDecksNotifier.createDeck', () {
    test('prepends the created deck and returns true', () async {
      final notifier =
          MyDecksNotifier(_FakeDecksService(myDecks: const [_deck]));
      await notifier.loadMyDecks();

      final ok = await notifier.createDeck(title: 'New');

      expect(ok, isTrue);
      expect(notifier.state.decks.first.title, 'New');
      expect(notifier.state.decks.length, 2);
      expect(notifier.state.isSaving, isFalse);
    });

    test('sets error and returns false on failure', () async {
      final notifier = MyDecksNotifier(_FakeDecksService(shouldThrow: true));

      final ok = await notifier.createDeck(title: 'New');

      expect(ok, isFalse);
      expect(notifier.state.error, contains('boom'));
      expect(notifier.state.isSaving, isFalse);
    });
  });

  group('MyDecksNotifier.deleteDeck', () {
    test('removes the deck from the list', () async {
      final notifier =
          MyDecksNotifier(_FakeDecksService(myDecks: const [_deck]));
      await notifier.loadMyDecks();

      final ok = await notifier.deleteDeck('d1');

      expect(ok, isTrue);
      expect(notifier.state.decks, isEmpty);
      expect(notifier.state.isSaving, isFalse);
    });
  });

  group('MyDecksNotifier.updateDeck', () {
    test('replaces the matching deck in place', () async {
      final notifier =
          MyDecksNotifier(_FakeDecksService(myDecks: const [_deck]));
      await notifier.loadMyDecks();

      final ok = await notifier.updateDeck('d1', title: 'Renamed');

      expect(ok, isTrue);
      expect(notifier.state.decks.single.id, 'd1');
      expect(notifier.state.decks.single.title, 'Renamed');
    });
  });

  group('MyDecksNotifier.loadDeck', () {
    test('sets currentDeck on success', () async {
      final notifier = MyDecksNotifier(
        _FakeDecksService(deck: const DeckModel(id: 'd9', title: 'Open')),
      );

      await notifier.loadDeck('d9');

      expect(notifier.state.currentDeck?.id, 'd9');
      expect(notifier.state.isLoadingDeck, isFalse);
      expect(notifier.state.deckError, isNull);
    });

    test('sets deckError on failure', () async {
      final notifier = MyDecksNotifier(_FakeDecksService(shouldThrow: true));

      await notifier.loadDeck('d9');

      expect(notifier.state.deckError, contains('boom'));
      expect(notifier.state.isLoadingDeck, isFalse);
    });
  });
}
