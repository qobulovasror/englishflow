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
    } catch (_) {
      await _tokenStorage.clearAll();
      state = state.copyWith(isLoading: false, clearUser: true);
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
