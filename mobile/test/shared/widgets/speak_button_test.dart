import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:englishflow/shared/widgets/speak_button.dart';

void main() {
  // Rendering only: tapping would invoke the flutter_tts platform channel,
  // which is unavailable in the test harness, so we assert structure instead.
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('renders a speaker IconButton with the Listen tooltip',
      (tester) async {
    await tester.pumpWidget(wrap(const SpeakButton(word: 'apple')));

    expect(find.byType(IconButton), findsOneWidget);
    expect(find.byIcon(Icons.volume_up_outlined), findsOneWidget);
    expect(find.byTooltip('Listen'), findsOneWidget);
  });

  testWidgets('honours the supplied icon size', (tester) async {
    await tester.pumpWidget(wrap(const SpeakButton(word: 'apple', size: 40)));

    final icon = tester.widget<Icon>(find.byIcon(Icons.volume_up_outlined));
    expect(icon.size, 40);
  });

  testWidgets('exposes an onPressed handler', (tester) async {
    await tester.pumpWidget(wrap(const SpeakButton(word: 'apple')));

    final button = tester.widget<IconButton>(find.byType(IconButton));
    expect(button.onPressed, isNotNull);
  });
}
