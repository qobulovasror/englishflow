import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:englishflow/core/constants/app_constants.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage();
});

/// Backs the access/refresh tokens with the platform secure store
/// (Keychain on iOS, encrypted SharedPreferences/Keystore on Android),
/// rather than plain `SharedPreferences`. Plain prefs are world-readable
/// on a rooted/jailbroken device and survive in unencrypted backups.
class TokenStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  Future<void> saveToken(String token) =>
      _storage.write(key: AppConstants.tokenKey, value: token);

  Future<String?> getToken() => _storage.read(key: AppConstants.tokenKey);

  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: AppConstants.refreshTokenKey, value: token);

  Future<String?> getRefreshToken() =>
      _storage.read(key: AppConstants.refreshTokenKey);

  Future<void> saveUserData(String userData) =>
      _storage.write(key: AppConstants.userKey, value: userData);

  Future<String?> getUserData() => _storage.read(key: AppConstants.userKey);

  Future<void> clearAll() async {
    await _storage.delete(key: AppConstants.tokenKey);
    await _storage.delete(key: AppConstants.refreshTokenKey);
    await _storage.delete(key: AppConstants.userKey);
  }

  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
