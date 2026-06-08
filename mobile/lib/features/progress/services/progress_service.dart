import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:englishflow/core/constants/api_endpoints.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/features/progress/models/progress_model.dart';

final progressServiceProvider = Provider<ProgressService>((ref) {
  return ProgressService(ref.watch(dioProvider));
});

class ProgressService {
  final Dio _dio;

  ProgressService(this._dio);

  Future<ProgressStats> getProgress() async {
    try {
      final response = await _dio.get(ApiEndpoints.progress);
      return ProgressStats.fromJson(response.data);
    } on DioException catch (e) {
      throw e.error is ApiException
          ? e.error as ApiException
          : ApiException(message: 'Failed to load progress');
    }
  }
}
