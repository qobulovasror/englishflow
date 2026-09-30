class UpdateProfileRequest {
  final String? email;
  // Required by the backend whenever `email` is being changed — guards against
  // account takeover via a stolen access token. Not needed for a goal-only
  // change.
  final String? currentPassword;
  // Number of cards the user aims to review per day (1–200).
  final int? dailyGoal;
  final int? dailyNewLimit;
  final bool? reminderEnabled;
  final int? reminderHour;
  final int? reminderMinute;
  final List<int>? reminderDays;
  final String? reminderTimezone;

  const UpdateProfileRequest({
    this.email,
    this.currentPassword,
    this.dailyGoal,
    this.dailyNewLimit,
    this.reminderEnabled,
    this.reminderHour,
    this.reminderMinute,
    this.reminderDays,
    this.reminderTimezone,
  });

  Map<String, dynamic> toJson() => {
        if (email != null) 'email': email,
        if (currentPassword != null) 'currentPassword': currentPassword,
        if (dailyGoal != null) 'dailyGoal': dailyGoal,
        if (dailyNewLimit != null) 'dailyNewLimit': dailyNewLimit,
        if (reminderEnabled != null) 'reminderEnabled': reminderEnabled,
        if (reminderHour != null) 'reminderHour': reminderHour,
        if (reminderMinute != null) 'reminderMinute': reminderMinute,
        if (reminderDays != null) 'reminderDays': reminderDays,
        if (reminderTimezone != null) 'reminderTimezone': reminderTimezone,
      };
}
