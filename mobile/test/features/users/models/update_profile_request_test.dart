import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/features/users/models/update_profile_request.dart';

void main() {
  test('UpdateProfileRequest serializes email and currentPassword', () {
    const withEmail = UpdateProfileRequest(
      email: 'new@example.com',
      currentPassword: 'Current!1',
    );
    expect(withEmail.toJson(), {
      'email': 'new@example.com',
      'currentPassword': 'Current!1',
    });
  });

  test('UpdateProfileRequest omits email when null', () {
    const noEmail = UpdateProfileRequest(currentPassword: 'Current!1');
    expect(noEmail.toJson(), {'currentPassword': 'Current!1'});
  });

  test('serializes reminder preferences together', () {
    const request = UpdateProfileRequest(
      reminderEnabled: true,
      reminderHour: 8,
      reminderMinute: 15,
      reminderDays: [1, 3, 5],
      reminderTimezone: 'Asia/Tashkent',
    );
    expect(request.toJson(), {
      'reminderEnabled': true,
      'reminderHour': 8,
      'reminderMinute': 15,
      'reminderDays': [1, 3, 5],
      'reminderTimezone': 'Asia/Tashkent',
    });
  });
}
