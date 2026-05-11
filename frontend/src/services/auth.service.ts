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
}
