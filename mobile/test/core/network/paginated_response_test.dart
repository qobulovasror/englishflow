import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/core/network/paginated_response.dart';

class _Item {
  final String id;
  const _Item(this.id);
  factory _Item.fromJson(Map<String, dynamic> json) => _Item(json['id'] as String);
}

void main() {
  group('PaginatedResponse.fromJson', () {
    test('parses items via factory and metadata fields', () {
      final page = PaginatedResponse<_Item>.fromJson(
        {
          'items': [
            {'id': 'a'},
            {'id': 'b'},
          ],
          'total': 42,
          'page': 1,
          'limit': 2,
          'hasMore': true,
        },
        _Item.fromJson,
      );

      expect(page.items.map((e) => e.id).toList(), ['a', 'b']);
      expect(page.total, 42);
      expect(page.page, 1);
      expect(page.limit, 2);
      expect(page.hasMore, isTrue);
    });

    test('applies sensible defaults when fields are missing', () {
      final page = PaginatedResponse<_Item>.fromJson(
        {'items': []},
        _Item.fromJson,
      );

      expect(page.items, isEmpty);
      expect(page.total, 0);
      expect(page.page, 1);
      expect(page.limit, 0);
      expect(page.hasMore, isFalse);
    });

    test('handles null items list', () {
      final page = PaginatedResponse<_Item>.fromJson({}, _Item.fromJson);
      expect(page.items, isEmpty);
    });
  });
}
