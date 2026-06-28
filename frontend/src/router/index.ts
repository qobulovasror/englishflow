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

  // Force unfinished onboarding. Strict `=== null` so users whose stored profile
  // predates the field (undefined) are left alone — the backend backfilled them
  // as onboarded already.
  const needsOnboarding = isAuthenticated && user?.onboardedAt === null
  if (needsOnboarding && to.name !== 'Onboarding') {
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
