import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:englishflow/core/theme/app_colors.dart';

/// Shared text-to-speech instance so we don't spin up a new engine per button.
final FlutterTts _tts = FlutterTts();
bool _ttsConfigured = false;

Future<void> _ensureConfigured() async {
  if (_ttsConfigured) return;
  await _tts.setLanguage('en-US');
  await _tts.setSpeechRate(0.45);
  await _tts.setPitch(1.0);
  _ttsConfigured = true;
}

/// A small speaker [IconButton] that pronounces an English [word] aloud.
///
/// Uses on-device text-to-speech (flutter_tts). An [audioUrl] may be supplied
/// by the backend; it is kept for future use, but TTS of the word text is the
/// baseline behaviour.
class SpeakButton extends StatelessWidget {
  final String word;
  final String? audioUrl;
  final Color? color;
  final double size;

  const SpeakButton({
    super.key,
    required this.word,
    this.audioUrl,
    this.color,
    this.size = 24,
  });

  Future<void> _speak() async {
    final text = word.trim();
    if (text.isEmpty) return;
    await _ensureConfigured();
    await _tts.stop();
    await _tts.setLanguage('en-US');
    await _tts.speak(text);
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(Icons.volume_up_outlined, size: size),
      color: color ?? AppColors.secondary,
      tooltip: 'Listen',
      onPressed: _speak,
    );
  }
}
