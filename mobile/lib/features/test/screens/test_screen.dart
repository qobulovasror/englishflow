import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/theme/app_text_styles.dart';

class TestScreen extends ConsumerStatefulWidget {
  const TestScreen({super.key});

  @override
  ConsumerState<TestScreen> createState() => _TestScreenState();
}

class _TestScreenState extends ConsumerState<TestScreen> {
  String mode = 'FORWARD';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Test', style: AppTextStyles.heading2),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.orange,
                    AppColors.orange.withOpacity(0.8),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.quiz_rounded,
                    size: 64,
                    color: Colors.white,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Vocabulary Quiz',
                    style: AppTextStyles.heading2.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Test your knowledge with multiple choice questions',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white.withOpacity(0.9),
                    ),
                  ),
                  const SizedBox(height: 20),
                  DropdownButtonFormField<String>(
                    value: mode,
                    dropdownColor: Colors.white,
                    decoration: const InputDecoration(
                      labelText: 'Exercise type',
                      filled: true,
                      fillColor: Colors.white,
                    ),
                    items: const [
                      DropdownMenuItem(
                          value: 'FORWARD',
                          child: Text('English to translation')),
                      DropdownMenuItem(
                          value: 'REVERSE',
                          child: Text('Translation to English')),
                      DropdownMenuItem(
                          value: 'TYPED', child: Text('Type the answer')),
                      DropdownMenuItem(
                          value: 'CLOZE', child: Text('Complete the sentence')),
                      DropdownMenuItem(
                          value: 'LISTENING', child: Text('Listening')),
                      DropdownMenuItem(
                          value: 'MISTAKES',
                          child: Text('Practice missed words')),
                      DropdownMenuItem(
                          value: 'DIFFICULT',
                          child: Text('Practice difficult words')),
                    ],
                    onChanged: (value) =>
                        setState(() => mode = value ?? 'FORWARD'),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.push('/quiz?mode=$mode'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.orange,
                      ),
                      child: const Text('Start Quiz'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Info cards
            Text('How it works', style: AppTextStyles.heading3),
            const SizedBox(height: 16),
            _InfoCard(
              icon: Icons.looks_one,
              title: 'Read the word',
              description: 'You will see an English word',
              color: AppColors.secondary,
            ),
            const SizedBox(height: 12),
            _InfoCard(
              icon: Icons.looks_two,
              title: 'Choose the answer',
              description: 'Pick the correct translation from 4 options',
              color: AppColors.purple,
            ),
            const SizedBox(height: 12),
            _InfoCard(
              icon: Icons.looks_3,
              title: 'See your score',
              description: 'Get instant feedback on your performance',
              color: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color color;

  const _InfoCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.bodyBold),
                const SizedBox(height: 2),
                Text(description, style: AppTextStyles.caption),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
