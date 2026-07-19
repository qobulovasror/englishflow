import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import { usersService } from '@/services/users.service'
import {
  extractErrorMessage,
  silentRefresh,
  setAccessToken,
  registerSessionHandlers,
} from '@/services/api'
import type { ChangePasswordPayload, OnboardingPayload, UpdateProfilePayload, User } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // No localStorage: the access token lives in memory (in api.ts) and the user
  // is re-fetched from the refresh cookie on boot. This store is the single
  // reactive mirror the UI reads; the api interceptor keeps it in sync via the
  // registered session handlers below.
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function persistUser(nextUser: User) {
    user.value = nextUser
  }

  function persistSession(nextUser: User, nextAccessToken: string) {
    token.value = nextAccessToken
    setAccessToken(nextAccessToken)
    persistUser(nextUser)
  }

  function clearSession() {
    user.value = null
    token.value = null
    setAccessToken(null)
  }

  // Let the api interceptor drive the reactive session state. On a silent
  // refresh it hands us the fresh token + user; on refresh failure / terminal
  // 401 it clears us — keeping `isAuthenticated` truthful so guards don't loop.
  registerSessionHandlers({
    onRefreshed: (nextAccessToken, nextUser) => {
      token.value = nextAccessToken
      user.value = nextUser as unknown as User
    },
    onCleared: () => {
      user.value = null
      token.value = null
    },
  })

  async function register(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await authService.register(email, password)
      // Refresh token is set as httpOnly cookie by the server; we never see
      // it on the JS side. The response shape still includes it for mobile
      // compat — we ignore that field deliberately.
      persistSession(response.user, response.accessToken)
      router.push('/dashboard')
    } catch (e) {
      error.value = extractErrorMessage(e, 'Registration failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await authService.login(email, password)
      persistSession(response.user, response.accessToken)
      router.push('/dashboard')
    } catch (e) {
      error.value = extractErrorMessage(e, 'Login failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Called once on app boot. If a valid `refresh_token` cookie exists, this
   * mints a fresh access token and we're authenticated; otherwise we stay
   * logged out (no error). Run BEFORE the router mounts so guards see the
   * correct state.
   */
  async function tryRestore(): Promise<void> {
    // silentRefresh() triggers performRefresh(), whose onRefreshed hook sets
    // token + user for us on success. On failure we make sure we're cleared.
    const newToken = await silentRefresh()
    if (!newToken) {
      clearSession()
    }
  }

  async function fetchMe() {
    loading.value = true
    error.value = null
    try {
      const me = await usersService.getMe()
      persistUser(me)
      return me
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to load profile')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    loading.value = true
    error.value = null
    try {
      const updated = await usersService.updateMe(payload)
      persistUser(updated)
      return updated
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to update profile')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function completeOnboarding(payload: OnboardingPayload) {
    loading.value = true
    error.value = null
    try {
      const updated = await usersService.completeOnboarding(payload)
      persistUser(updated)
      return updated
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to finish onboarding')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function changePassword(payload: ChangePasswordPayload) {
    loading.value = true
    error.value = null
    try {
      await usersService.changePassword(payload)
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to change password')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      // Best-effort revocation; clear local state regardless.
    }
    clearSession()
    router.push('/login')
  }

  async function deleteAccount(currentPassword: string) {
    loading.value = true
    error.value = null
    try {
      await usersService.deleteMe(currentPassword)
      clearSession()
      router.push('/login')
    } catch (e) {
      error.value = extractErrorMessage(e, 'Failed to delete account')
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    deleteAccount,
    fetchMe,
    updateProfile,
    changePassword,
    completeOnboarding,
    tryRestore,
  }
})
