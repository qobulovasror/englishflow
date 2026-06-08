import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/features/users/models/change_password_request.dart';

void main() {
  test('ChangePasswordRequest serializes both fields', () {
    const request = ChangePasswordRequest(
      currentPassword: 'CurrentPass123!',
      newPassword: 'NewBetterPass456!',
    );

    expect(request.toJson(), {
      'currentPassword': 'CurrentPass123!',
      'newPassword': 'NewBetterPass456!',
    });
  });
}
