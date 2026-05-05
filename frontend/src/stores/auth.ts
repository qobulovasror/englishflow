import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import type { User } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function register(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await authService.register(email, password)
      user.value = response.user
      token.value = response.accessToken
      localStorage.setItem('token', response.accessToken)
      localStorage.setItem('user', JSON.stringify(response.user))
      router.push('/dashboard')
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Registration failed'
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
      user.value = response.user
      token.value = response.accessToken
      localStorage.setItem('token', response.accessToken)
      localStorage.setItem('user', JSON.stringify(response.user))
      router.push('/dashboard')
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return { user, token, loading, error, isAuthenticated, register, login, logout }
})
