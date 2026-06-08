/// Mirrors the backend's `PaginatedResponseDto<T>` returned from list
/// endpoints like `GET /words`.
class PaginatedResponse<T> {
  final List<T> items;
  final int total;
  final int page;
  final int limit;
  final bool hasMore;

  const PaginatedResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.hasMore,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) itemFromJson,
  ) {
    final rawItems = (json['items'] as List? ?? [])
        .map((e) => itemFromJson(e as Map<String, dynamic>))
        .toList();
    return PaginatedResponse(
      items: rawItems,
      total: (json['total'] as num?)?.toInt() ?? rawItems.length,
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? rawItems.length,
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }
}
