import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/shared/models/user_model.dart';

void main() {
  group('UserModel.fromJson', () {
    test('parses required fields', () {
      final user = UserModel.fromJson({
        'id': 'abc-123',
        'email': 'student@example.com',
      });

      expect(user.id, 'abc-123');
      expect(user.email, 'student@example.com');
      expect(user.createdAt, isNull);
    });

    test('parses ISO 8601 createdAt', () {
      final user = UserModel.fromJson({
        'id': 'abc-123',
        'email': 'a@b.c',
        'createdAt': '2026-05-11T12:30:00.000Z',
      });

      expect(user.createdAt, isNotNull);
      expect(user.createdAt!.toUtc().year, 2026);
      expect(user.createdAt!.toUtc().month, 5);
      expect(user.createdAt!.toUtc().day, 11);
    });

    test('falls back to empty strings when fields are missing', () {
      final user = UserModel.fromJson({});
      expect(user.id, '');
      expect(user.email, '');
    });

    test('returns null createdAt for malformed dates', () {
      final user = UserModel.fromJson({
        'id': 'x',
        'email': 'y',
        'createdAt': 'not-a-date',
      });
      expect(user.createdAt, isNull);
    });

    test('coerces numeric id to string', () {
      final user = UserModel.fromJson({'id': 42, 'email': 'a@b.c'});
      expect(user.id, '42');
    });
  });

  group('UserModel.toJson', () {
    test('serializes without createdAt when null', () {
      const user = UserModel(id: '1', email: 'a@b.c');
      expect(user.toJson(), {'id': '1', 'email': 'a@b.c'});
    });

    test('serializes createdAt as ISO string when set', () {
      final user = UserModel(
        id: '1',
        email: 'a@b.c',
        createdAt: DateTime.utc(2026, 5, 11, 12),
      );
      expect(user.toJson()['createdAt'], '2026-05-11T12:00:00.000Z');
    });
  });

  test('displayName uses email local-part', () {
    const user = UserModel(id: '1', email: 'asror.dev@example.com');
    expect(user.displayName, 'asror.dev');
  });

  test('equatable equality', () {
    const a = UserModel(id: '1', email: 'x@y.z');
    const b = UserModel(id: '1', email: 'x@y.z');
    const c = UserModel(id: '2', email: 'x@y.z');
    expect(a, b);
    expect(a, isNot(c));
  });

  group('role and email verification', () {
    test('parses role and emailVerifiedAt', () {
      final user = UserModel.fromJson({
        'id': '1',
        'email': 'a@b.c',
        'role': 'ADMIN',
        'emailVerifiedAt': '2026-06-01T10:00:00.000Z',
      });
      expect(user.role, 'ADMIN');
      expect(user.emailVerifiedAt, isNotNull);
      expect(user.isEmailVerified, isTrue);
    });

    test('isEmailVerified is false when emailVerifiedAt is null', () {
      const user = UserModel(id: '1', email: 'a@b.c');
      expect(user.isEmailVerified, isFalse);
      expect(user.role, isNull);
    });

    test('needsOnboarding reflects onboardedAt', () {
      const fresh = UserModel(id: '1', email: 'a@b.c');
      expect(fresh.needsOnboarding, isTrue);

      final onboarded = UserModel(
        id: '1',
        email: 'a@b.c',
        onboardedAt: DateTime.utc(2026, 6, 1),
      );
      expect(onboarded.needsOnboarding, isFalse);
    });

    test('toJson includes role/dailyGoal/emailVerifiedAt only when set', () {
      const minimal = UserModel(id: '1', email: 'a@b.c');
      final json = minimal.toJson();
      expect(json.containsKey('role'), isFalse);
      expect(json.containsKey('dailyGoal'), isFalse);
      expect(json.containsKey('emailVerifiedAt'), isFalse);

      final full = UserModel(
        id: '1',
        email: 'a@b.c',
        role: 'STUDENT',
        dailyGoal: 20,
        emailVerifiedAt: DateTime.utc(2026, 6, 1, 9),
      );
      final fullJson = full.toJson();
      expect(fullJson['role'], 'STUDENT');
      expect(fullJson['dailyGoal'], 20);
      expect(fullJson['emailVerifiedAt'], '2026-06-01T09:00:00.000Z');
    });
  });
}
