import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/auth/RegisterPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/pages/auth/ResetPasswordPage.vue'),
    meta: { guest: true },
  },
  {
    // Reachable whether signed in or out: the verify endpoint is public, and a
    // logged-in user (the common case) must NOT be bounced away before it runs.
    // Deliberately no `guest`/`requiresAuth` meta.
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('@/pages/auth/VerifyEmailPage.vue'),
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/pages/OnboardingPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/main/DashboardPage.vue'),
      },
      {
        path: 'words',
        name: 'Words',
        component: () => import('@/pages/main/WordsPage.vue'),
      },
      {
        path: 'library',
        name: 'Library',
        component: () => import('@/pages/main/LibraryPage.vue'),
      },
      {
        path: 'my-decks',
        name: 'MyDecks',
        component: () => import('@/pages/main/MyDecksPage.vue'),
      },
      {
        path: 'my-decks/:id',
        name: 'DeckDetail',
        component: () => import('@/pages/main/DeckDetailPage.vue'),
      },
      {
        path: 'learn',
        name: 'Learn',
        component: () => import('@/pages/main/LearnPage.vue'),
      },
      {
        path: 'test',
        name: 'Test',
        component: () => import('@/pages/main/TestPage.vue'),
      },
      {
        path: 'progress',
        name: 'Progress',
        component: () => import('@/pages/main/ProgressPage.vue'),
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/pages/main/ProfilePage.vue'),
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/pages/admin/AdminDashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/pages/admin/AdminUsersPage.vue'),
        meta: { title: 'Users' },
      },
      {
        path: 'users/:id',
        name: 'AdminUserDetail',
        component: () => import('@/pages/admin/AdminUserDetailPage.vue'),
        meta: { title: 'User detail' },
      },
      {
        path: 'decks',
        name: 'AdminDecks',
        component: () => import('@/pages/admin/AdminDecksPage.vue'),
        meta: { title: 'Decks' },
      },
      {
        path: 'decks/:id',
        name: 'AdminDeckDetail',
        component: () => import('@/pages/admin/AdminDeckDetailPage.vue'),
        meta: { title: 'Deck detail' },
      },
      {
        path: 'words',
        name: 'AdminWords',
        component: () => import('@/pages/admin/AdminWordsPage.vue'),
        meta: { title: 'Words' },
      },
      {
        path: 'monitoring',
        name: 'AdminMonitoring',
        component: () => import('@/pages/admin/AdminMonitoringPage.vue'),
        meta: { title: 'Monitoring' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  // Read from the Pinia store — the access token lives in store state, not
  // localStorage. `tryRestore()` runs before the router is mounted, so by
  // the time this guard fires the store reflects the real session.
  const { isAuthenticated, user } = useAuthStore()

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }
  if (to.meta.guest && isAuthenticated) {
    next('/dashboard')
    return
  }

  // Admin-only routes: non-admins are bounced to the dashboard. The backend
  // also enforces role ADMIN (403), this is just UX.
  if (to.meta.requiresAdmin && user?.role !== 'ADMIN') {
    next('/dashboard')
    return
  }

  // Force unfinished onboarding. Strict `=== null` so users whose stored profile
  // predates the field (undefined) are left alone — the backend backfilled them
  // as onboarded already.
  const needsOnboarding = isAuthenticated && user?.onboardedAt === null
  // Let the verify-email flow complete even for a not-yet-onboarded user.
  if (needsOnboarding && to.name !== 'Onboarding' && to.name !== 'VerifyEmail') {
    next('/onboarding')
    return
  }
  if (!needsOnboarding && to.name === 'Onboarding') {
    next('/dashboard')
    return
  }

  next()
})

export default router
