import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String id;
  final String email;
  final String? level;
  // Null until the user finishes or skips onboarding.
  final DateTime? onboardedAt;
  final DateTime? createdAt;

  const UserModel({
    required this.id,
    required this.email,
    this.level,
    this.onboardedAt,
    this.createdAt,
  });

  String get displayName => email.split('@').first;

  bool get needsOnboarding => onboardedAt == null;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email'] ?? '',
      level: json['level']?.toString(),
      onboardedAt: json['onboardedAt'] != null
          ? DateTime.tryParse(json['onboardedAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      if (level != null) 'level': level,
      if (onboardedAt != null) 'onboardedAt': onboardedAt!.toIso8601String(),
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [id, email, level, onboardedAt, createdAt];
}
