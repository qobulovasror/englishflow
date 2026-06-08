import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary palette (Duolingo-inspired green)
  static const Color primary = Color(0xFF58CC02);
  static const Color primaryDark = Color(0xFF46A302);
  static const Color primaryLight = Color(0xFFD7FFB8);

  // Secondary
  static const Color secondary = Color(0xFF1CB0F6);
  static const Color secondaryLight = Color(0xFFDDF4FF);

  // Accent colors
  static const Color gold = Color(0xFFFFC800);
  static const Color orange = Color(0xFFFF9600);
  static const Color red = Color(0xFFFF4B4B);
  static const Color purple = Color(0xFFCE82FF);

  // Neutral
  static const Color surface = Color(0xFFF7F7F7);
  static const Color background = Colors.white;
  static const Color border = Color(0xFFE5E5E5);
  static const Color inputFill = Color(0xFFF7F7F7);

  // Text
  static const Color textPrimary = Color(0xFF3C3C3C);
  static const Color textSecondary = Color(0xFF777777);
  static const Color textHint = Color(0xFFAFAFAF);

  // Status
  static const Color success = Color(0xFF58CC02);
  static const Color error = Color(0xFFFF4B4B);
  static const Color warning = Color(0xFFFFC800);
  static const Color info = Color(0xFF1CB0F6);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryDark],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
