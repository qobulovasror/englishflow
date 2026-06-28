import api from './api'
import type { AuthResponse } from '@/types'

export const authService = {
  async register(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', { email, password })
    return data
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    return data
  },

  /**
   * The browser attaches the `refresh_token` cookie automatically via
   * `withCredentials`; we never touch the token from JS. The body is empty.
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout', {})
  },

  // Always resolves 200 with a neutral message — no account enumeration.
  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
    return data
  },

  // Invalid/expired token → 400.
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    })
    return data
  },

  // Authenticated — sends a verification email to the current user.
  async requestEmailVerification(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/verify-email/request', {})
    return data
  },

  // Public — confirms the email with the token from the link.
  async verifyEmail(token: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/verify-email', { token })
    return data
  },
}
