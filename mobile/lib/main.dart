import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:englishflow/core/theme/app_theme.dart';
import 'package:englishflow/core/network/dio_client.dart';
import 'package:englishflow/core/constants/app_constants.dart';
import 'package:englishflow/features/auth/providers/auth_provider.dart';
import 'package:englishflow/core/router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox(AppConstants.cacheBox);

  runApp(const ProviderScope(child: EnglishFlowApp()));
}

class EnglishFlowApp extends ConsumerWidget {
  const EnglishFlowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'EnglishFlow',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
