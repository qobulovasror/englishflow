class UpdateProfileRequest {
  final String? email;
  // Required by the backend whenever `email` is being changed — guards against
  // account takeover via a stolen access token. Not needed for a goal-only
  // change.
  final String? currentPassword;
  // Number of cards the user aims to review per day (1–200).
  final int? dailyGoal;

  const UpdateProfileRequest({
    this.email,
    this.currentPassword,
    this.dailyGoal,
  });

  Map<String, dynamic> toJson() => {
        if (email != null) 'email': email,
        if (currentPassword != null) 'currentPassword': currentPassword,
        if (dailyGoal != null) 'dailyGoal': dailyGoal,
      };
}
