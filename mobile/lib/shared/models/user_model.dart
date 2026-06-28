import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String id;
  final String email;
  final String? role;
  final String? level;
  // Number of cards the user aims to review per day.
  final int? dailyGoal;
  // Null until the user finishes or skips onboarding.
  final DateTime? onboardedAt;
  // Null until the user confirms their email address.
  final DateTime? emailVerifiedAt;
  final DateTime? createdAt;

  const UserModel({
    required this.id,
    required this.email,
    this.role,
    this.level,
    this.dailyGoal,
    this.onboardedAt,
    this.emailVerifiedAt,
    this.createdAt,
  });

  String get displayName => email.split('@').first;

  bool get needsOnboarding => onboardedAt == null;

  bool get isEmailVerified => emailVerifiedAt != null;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email'] ?? '',
      role: json['role']?.toString(),
      level: json['level']?.toString(),
      dailyGoal: (json['dailyGoal'] as num?)?.toInt(),
      onboardedAt: json['onboardedAt'] != null
          ? DateTime.tryParse(json['onboardedAt'].toString())
          : null,
      emailVerifiedAt: json['emailVerifiedAt'] != null
          ? DateTime.tryParse(json['emailVerifiedAt'].toString())
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
      if (role != null) 'role': role,
      if (level != null) 'level': level,
      if (dailyGoal != null) 'dailyGoal': dailyGoal,
      if (onboardedAt != null) 'onboardedAt': onboardedAt!.toIso8601String(),
      if (emailVerifiedAt != null)
        'emailVerifiedAt': emailVerifiedAt!.toIso8601String(),
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
        id,
        email,
        role,
        level,
        dailyGoal,
        onboardedAt,
        emailVerifiedAt,
        createdAt,
      ];
}
