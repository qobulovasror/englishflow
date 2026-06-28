import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/features/users/models/change_password_request.dart';
import 'package:englishflow/features/users/models/update_profile_request.dart';
import 'package:englishflow/shared/models/user_model.dart';

final usersServiceProvider = Provider<UsersService>((ref) {
  return UsersService(ref.watch(dioProvider));
});

class UsersService {
  final Dio _dio;

  UsersService(this._dio);

  Future<UserModel> getMe() async {
    try {
      final response = await _dio.get(ApiEndpoints.me);
      return UserModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to load profile');
    }
  }

  Future<UserModel> updateMe(UpdateProfileRequest request) async {
    try {
      final response = await _dio.patch(
        ApiEndpoints.me,
        data: request.toJson(),
      );
      return UserModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to update profile');
    }
  }

  Future<UserModel> completeOnboarding({
    String? level,
    required List<String> deckIds,
  }) async {
    try {
      final response = await _dio.patch(
        ApiEndpoints.onboarding,
        data: {
          if (level != null) 'level': level,
          'deckIds': deckIds,
        },
      );
      return UserModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to finish onboarding');
    }
  }

  Future<void> changePassword(ChangePasswordRequest request) async {
    try {
      await _dio.post(
        ApiEndpoints.changePassword,
        data: request.toJson(),
      );
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to change password');
    }
  }

  /// Permanently deletes the authenticated user's account. Requires the
  /// current password for confirmation.
  Future<void> deleteMe(String currentPassword) async {
    try {
      await _dio.delete(
        ApiEndpoints.me,
        data: {'currentPassword': currentPassword},
      );
    } on DioException catch (e) {
      throw _toApiException(e, 'Failed to delete account');
    }
  }

  ApiException _toApiException(DioException e, String fallback) {
    if (e.error is ApiException) return e.error as ApiException;
    return ApiException(message: fallback);
  }
}
