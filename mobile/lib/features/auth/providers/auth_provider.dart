import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/utils/token_storage.dart';
import 'package:englishflow/features/auth/models/auth_state.dart';
import 'package:englishflow/features/auth/models/login_request.dart';
import 'package:englishflow/features/auth/models/register_request.dart';
import 'package:englishflow/features/auth/services/auth_service.dart';
import 'package:englishflow/features/users/models/change_password_request.dart';
import 'package:englishflow/features/users/models/update_profile_request.dart';
import 'package:englishflow/features/users/services/users_service.dart';
import 'package:englishflow/shared/models/user_model.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    authService: ref.watch(authServiceProvider),
    usersService: ref.watch(usersServiceProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final UsersService _usersService;
  final TokenStorage _tokenStorage;

  AuthNotifier({
    required AuthService authService,
    required UsersService usersService,
    required TokenStorage tokenStorage,
  })  : _authService = authService,
        _usersService = usersService,
        _tokenStorage = tokenStorage,
        super(const AuthState());

  Future<void> tryAutoLogin() async {
    final token = await _tokenStorage.getToken();
    if (token == null) return;

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final userData = await _tokenStorage.getUserData();
      UserModel? user;
      if (userData != null) {
        user = UserModel.fromJson(jsonDecode(userData));
      }
      state = state.copyWith(
        token: token,
        user: user,
        isLoading: false,
      );

      // Best-effort refresh so fields added after the cached copy (e.g.
      // onboardedAt) are accurate. Stay logged in on failure (offline).
      try {
        final fresh = await _usersService.getMe();
        await _tokenStorage.saveUserData(jsonEncode(fresh.toJson()));
        state = state.copyWith(user: fresh);
      } catch (_) {
        /* keep cached user */
      }
    } catch (_) {
      await _tokenStorage.clearAll();
      state = state.copyWith(isLoading: false, clearUser: true);
    }
  }

  Future<UserModel> completeOnboarding({
    String? level,
    required List<String> deckIds,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _usersService.completeOnboarding(
        level: level,
        deckIds: deckIds,
      );
      await _tokenStorage.saveUserData(jsonEncode(user.toJson()));
      state = state.copyWith(user: user, isLoading: false);
      return user;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _authService.login(
        LoginRequest(email: email, password: password),
      );
      await _persistSession(response.accessToken, response.refreshToken, response.user);
      state = state.copyWith(
        token: response.accessToken,
        user: response.user,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> register(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _authService.register(
        RegisterRequest(email: email, password: password),
      );
      await _persistSession(response.accessToken, response.refreshToken, response.user);
      state = state.copyWith(
        token: response.accessToken,
        user: response.user,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Fetches the latest user from the server and syncs it into state.
  /// Errors are stored on `state.error` and re-thrown so callers can show
  /// per-screen feedback.
  Future<UserModel> fetchMe() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _usersService.getMe();
      await _tokenStorage.saveUserData(jsonEncode(user.toJson()));
      state = state.copyWith(user: user, isLoading: false);
      return user;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<UserModel> updateProfile({
    required String email,
    required String currentPassword,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final updated = await _usersService.updateMe(
        UpdateProfileRequest(email: email, currentPassword: currentPassword),
      );
      await _tokenStorage.saveUserData(jsonEncode(updated.toJson()));
      state = state.copyWith(user: updated, isLoading: false);
      return updated;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  /// Updates only the daily goal (no current password required). Persists and
  /// syncs the refreshed user into state.
  Future<UserModel> updateDailyGoal(int dailyGoal) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final updated = await _usersService.updateMe(
        UpdateProfileRequest(dailyGoal: dailyGoal),
      );
      await _tokenStorage.saveUserData(jsonEncode(updated.toJson()));
      state = state.copyWith(user: updated, isLoading: false);
      return updated;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _usersService.changePassword(
        ChangePasswordRequest(
          currentPassword: currentPassword,
          newPassword: newPassword,
        ),
      );
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  /// Requests a password-reset email. Errors are re-thrown so the caller can
  /// decide how to surface them (the screen shows a neutral message on success).
  Future<void> forgotPassword(String email) async {
    await _authService.forgotPassword(email);
  }

  /// Completes a password reset with a token pasted from the email.
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _authService.resetPassword(token: token, newPassword: newPassword);
  }

  /// Sends a verification email to the currently authenticated user.
  Future<void> requestEmailVerification() async {
    await _authService.requestEmailVerification();
  }

  /// Permanently deletes the account, then clears the local session.
  Future<void> deleteAccount(String currentPassword) async {
    await _usersService.deleteMe(currentPassword);
    await _tokenStorage.clearAll();
    state = const AuthState();
  }

  Future<void> logout() async {
    // Best-effort server-side revocation; never block the user's logout on a
    // network error.
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken != null) {
      await _authService.logout(refreshToken);
    }
    await _tokenStorage.clearAll();
    state = const AuthState();
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  Future<void> _persistSession(
    String accessToken,
    String refreshToken,
    UserModel user,
  ) async {
    await _tokenStorage.saveToken(accessToken);
    await _tokenStorage.saveRefreshToken(refreshToken);
    await _tokenStorage.saveUserData(jsonEncode(user.toJson()));
  }
}
