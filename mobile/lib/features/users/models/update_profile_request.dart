class UpdateProfileRequest {
  final String? email;
  // Required by the backend whenever `email` is being changed — guards against
  // account takeover via a stolen access token.
  final String currentPassword;

  const UpdateProfileRequest({
    this.email,
    required this.currentPassword,
  });

  Map<String, dynamic> toJson() => {
        if (email != null) 'email': email,
        'currentPassword': currentPassword,
      };
}
