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
  const { isAuthenticated } = useAuthStore()

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.guest && isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
