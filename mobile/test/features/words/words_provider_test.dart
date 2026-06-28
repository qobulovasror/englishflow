import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/core/network/paginated_response.dart';
import 'package:englishflow/features/words/models/word_model.dart';
import 'package:englishflow/features/words/providers/words_provider.dart';
import 'package:englishflow/features/words/services/words_service.dart';

/// Hand-written fake (no mocking lib available). Implements the same public
/// surface the notifier depends on; unused members throw.
class _FakeWordsService implements WordsService {
  List<WordModel> words;
  bool shouldThrow;
  String? lastStatusFilter;
  int getWordsCalls = 0;

  _FakeWordsService({this.words = const [], this.shouldThrow = false});

  @override
  Future<List<WordModel>> getWords({String? status}) async {
    getWordsCalls++;
    lastStatusFilter = status;
    if (shouldThrow) throw Exception('boom');
    return words;
  }

  @override
  Future<WordModel> addWord({
    required String word,
    required String translation,
    String? example,
  }) async {
    if (shouldThrow) throw Exception('boom');
    return WordModel(
      id: 'new-id',
      word: word,
      translation: translation,
      example: example,
    );
  }

  @override
  Future<WordModel> updateWord(
    String id, {
    String? word,
    String? translation,
    String? example,
  }) async {
    if (shouldThrow) throw Exception('boom');
    return WordModel(
      id: id,
      word: word ?? 'unchanged',
      translation: translation ?? 'unchanged',
      example: example,
    );
  }

  @override
  Future<void> deleteWord(String id) async {
    if (shouldThrow) throw Exception('boom');
  }

  @override
  Future<PaginatedResponse<WordModel>> getWordsPage({
    int page = 1,
    int limit = 100,
    String? status,
  }) =>
      throw UnimplementedError();
}

const _word = WordModel(id: '1', word: 'apple', translation: 'olma');

void main() {
  group('WordsNotifier.loadWords', () {
    test('populates words and clears loading on success', () async {
      final notifier = WordsNotifier(
        _FakeWordsService(words: const [_word]),
      );

      await notifier.loadWords();

      expect(notifier.state.words, const [_word]);
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, isNull);
    });

    test('sets error and clears loading on failure', () async {
      final notifier = WordsNotifier(_FakeWordsService(shouldThrow: true));

      await notifier.loadWords();

      expect(notifier.state.words, isEmpty);
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.error, contains('boom'));
    });

    test('passes the active status filter through to the service', () async {
      final fake = _FakeWordsService(words: const []);
      final notifier = WordsNotifier(fake);

      await notifier.setStatusFilter('LEARNING');

      expect(notifier.state.statusFilter, 'LEARNING');
      expect(fake.lastStatusFilter, 'LEARNING');
    });

    test('setStatusFilter is a no-op when unchanged', () async {
      final fake = _FakeWordsService();
      final notifier = WordsNotifier(fake);

      await notifier.setStatusFilter(null); // already null
      expect(fake.getWordsCalls, 0);
    });
  });

  group('WordsNotifier.addWord', () {
    test('prepends the new word and returns true', () async {
      final notifier = WordsNotifier(_FakeWordsService(words: const [_word]));
      await notifier.loadWords();

      final ok = await notifier.addWord(word: 'book', translation: 'kitob');

      expect(ok, isTrue);
      expect(notifier.state.words.first.word, 'book');
      expect(notifier.state.words.length, 2);
      expect(notifier.state.isAdding, isFalse);
    });

    test('sets error and returns false on failure', () async {
      final notifier = WordsNotifier(_FakeWordsService(shouldThrow: true));

      final ok = await notifier.addWord(word: 'x', translation: 'y');

      expect(ok, isFalse);
      expect(notifier.state.error, contains('boom'));
      expect(notifier.state.isAdding, isFalse);
    });
  });

  group('WordsNotifier.updateWord', () {
    test('replaces the matching word in place', () async {
      final notifier = WordsNotifier(_FakeWordsService(words: const [_word]));
      await notifier.loadWords();

      final ok = await notifier.updateWord('1', translation: 'meva');

      expect(ok, isTrue);
      expect(notifier.state.words.single.id, '1');
      expect(notifier.state.words.single.translation, 'meva');
      expect(notifier.state.isUpdating, isFalse);
    });
  });

  group('WordsNotifier.deleteWord', () {
    test('removes the word from the list', () async {
      final notifier = WordsNotifier(_FakeWordsService(words: const [_word]));
      await notifier.loadWords();

      final ok = await notifier.deleteWord('1');

      expect(ok, isTrue);
      expect(notifier.state.words, isEmpty);
    });

    test('returns false and sets error on failure', () async {
      final fake = _FakeWordsService(words: const [_word]);
      final notifier = WordsNotifier(fake);
      await notifier.loadWords();
      fake.shouldThrow = true;

      final ok = await notifier.deleteWord('1');

      expect(ok, isFalse);
      expect(notifier.state.error, contains('boom'));
      expect(notifier.state.words, const [_word]); // unchanged
    });
  });
}
