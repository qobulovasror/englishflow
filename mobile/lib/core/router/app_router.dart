import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:englishflow/features/auth/providers/auth_provider.dart';
import 'package:englishflow/features/auth/screens/login_screen.dart';
import 'package:englishflow/features/auth/screens/register_screen.dart';
import 'package:englishflow/features/words/models/word_model.dart';
import 'package:englishflow/features/words/screens/words_screen.dart';
import 'package:englishflow/features/words/screens/add_word_screen.dart';
import 'package:englishflow/features/words/screens/edit_word_screen.dart';
import 'package:englishflow/features/learning/screens/learn_screen.dart';
import 'package:englishflow/features/learning/screens/flashcard_screen.dart';
import 'package:englishflow/features/test/screens/test_screen.dart';
import 'package:englishflow/features/test/screens/quiz_screen.dart';
import 'package:englishflow/features/test/screens/quiz_result_screen.dart';
import 'package:englishflow/features/progress/screens/progress_screen.dart';
import 'package:englishflow/features/users/screens/profile_screen.dart';
import 'package:englishflow/features/onboarding/screens/onboarding_screen.dart';
import 'package:englishflow/features/decks/models/deck_model.dart';
import 'package:englishflow/features/decks/screens/library_screen.dart';
import 'package:englishflow/features/decks/screens/my_decks_screen.dart';
import 'package:englishflow/features/decks/screens/deck_form_screen.dart';
import 'package:englishflow/features/decks/screens/deck_detail_screen.dart';
import 'package:englishflow/shared/widgets/main_scaffold.dart';
import 'package:englishflow/features/auth/screens/splash_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';
      final isSplash = state.matchedLocation == '/splash';
      final isOnboarding = state.matchedLocation == '/onboarding';

      if (isSplash) return null;

      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }

      if (isAuthenticated && isAuthRoute) {
        return '/home';
      }

      // Force unfinished onboarding once the user is authenticated.
      final needsOnboarding =
          isAuthenticated && (authState.user?.needsOnboarding ?? false);
      if (needsOnboarding && !isOnboarding) {
        return '/onboarding';
      }
      if (!needsOnboarding && isOnboarding) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: LearnScreen(),
            ),
          ),
          GoRoute(
            path: '/learn',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: LearnScreen(),
            ),
          ),
          GoRoute(
            path: '/test',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: TestScreen(),
            ),
          ),
          GoRoute(
            path: '/words',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: WordsScreen(),
            ),
          ),
          GoRoute(
            path: '/progress',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProgressScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/flashcards',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const FlashcardScreen(),
      ),
      GoRoute(
        path: '/quiz',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const QuizScreen(),
      ),
      GoRoute(
        path: '/quiz-result',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return QuizResultScreen(
            score: extra['score'] as int,
            total: extra['total'] as int,
          );
        },
      ),
      GoRoute(
        path: '/add-word',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AddWordScreen(),
      ),
      GoRoute(
        path: '/edit-word',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            EditWordScreen(word: state.extra as WordModel),
      ),
      GoRoute(
        path: '/library',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const LibraryScreen(),
      ),
      GoRoute(
        path: '/my-decks',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const MyDecksScreen(),
      ),
      GoRoute(
        path: '/deck-form',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            DeckFormScreen(deck: state.extra as DeckModel?),
      ),
      GoRoute(
        path: '/deck-detail',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            DeckDetailScreen(deck: state.extra as DeckModel),
      ),
    ],
  );
});
