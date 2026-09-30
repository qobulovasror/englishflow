import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String id;
  final String email;
  final String? role;
  final String? level;
  // Number of cards the user aims to review per day.
  final int? dailyGoal;
  final int? dailyNewLimit;
  final bool reminderEnabled;
  final int reminderHour;
  final int reminderMinute;
  final List<int> reminderDays;
  final String reminderTimezone;
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
    this.dailyNewLimit,
    this.reminderEnabled = false,
    this.reminderHour = 19,
    this.reminderMinute = 0,
    this.reminderDays = const [1, 2, 3, 4, 5],
    this.reminderTimezone = 'UTC',
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
      dailyNewLimit: (json['dailyNewLimit'] as num?)?.toInt(),
      reminderEnabled: json['reminderEnabled'] == true,
      reminderHour: (json['reminderHour'] as num?)?.toInt() ?? 19,
      reminderMinute: (json['reminderMinute'] as num?)?.toInt() ?? 0,
      reminderDays: (json['reminderDays'] as List<dynamic>?)
              ?.map((day) => (day as num).toInt())
              .toList() ??
          const [1, 2, 3, 4, 5],
      reminderTimezone: json['reminderTimezone']?.toString() ?? 'UTC',
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
      if (dailyNewLimit != null) 'dailyNewLimit': dailyNewLimit,
      'reminderEnabled': reminderEnabled,
      'reminderHour': reminderHour,
      'reminderMinute': reminderMinute,
      'reminderDays': reminderDays,
      'reminderTimezone': reminderTimezone,
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
        dailyNewLimit,
        reminderEnabled,
        reminderHour,
        reminderMinute,
        reminderDays,
        reminderTimezone,
        onboardedAt,
        emailVerifiedAt,
        createdAt,
      ];
}
