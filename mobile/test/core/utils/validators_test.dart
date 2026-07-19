import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/core/utils/validators.dart';

void main() {
  group('Validators.email', () {
    test('rejects null/empty', () {
      expect(Validators.email(null), 'Email is required');
      expect(Validators.email(''), 'Email is required');
    });

    test('rejects malformed addresses', () {
      expect(Validators.email('not-an-email'), isNotNull);
      expect(Validators.email('a@b'), isNotNull);
    });

    test('accepts a well-formed address', () {
      expect(Validators.email('student@example.com'), isNull);
    });

    test('accepts long / modern TLDs', () {
      expect(Validators.email('a@studio.photography'), isNull);
      expect(Validators.email('user@my.museum'), isNull);
    });
  });

  group('Validators.password', () {
    test('rejects null/empty', () {
      expect(Validators.password(null), 'Password is required');
      expect(Validators.password(''), 'Password is required');
    });

    test('enforces a minimum length of 6', () {
      expect(Validators.password('12345'), 'Password must be at least 6 characters');
      expect(Validators.password('123456'), isNull);
    });
  });

  group('Validators.required', () {
    test('rejects whitespace-only input', () {
      expect(Validators.required('   '), 'This field is required');
    });

    test('uses the provided field name in the message', () {
      expect(Validators.required(null, 'Title'), 'Title is required');
    });

    test('accepts non-empty input', () {
      expect(Validators.required('hello'), isNull);
    });
  });

  group('Validators.confirmPassword', () {
    test('rejects empty confirmation', () {
      expect(Validators.confirmPassword('', 'abc123'),
          'Please confirm your password');
    });

    test('rejects a mismatch', () {
      expect(Validators.confirmPassword('abc123', 'xyz789'),
          'Passwords do not match');
    });

    test('accepts a match', () {
      expect(Validators.confirmPassword('abc123', 'abc123'), isNull);
    });
  });
}
