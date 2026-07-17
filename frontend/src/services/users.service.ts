import api from './api'
import type { ChangePasswordPayload, OnboardingPayload, UpdateProfilePayload, User } from '@/types'

export const usersService = {
  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/users/me')
    return data
  },

  async completeOnboarding(payload: OnboardingPayload): Promise<User> {
    const { data } = await api.patch<User>('/users/me/onboarding', payload)
    return data
  },

  async updateMe(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await api.patch<User>('/users/me', payload)
    return data
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await api.post('/users/me/password', payload)
  },

  // Permanently deletes the current account. Requires the current password.
  async deleteMe(currentPassword: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>('/users/me', {
      data: { currentPassword },
    })
    return data
  },
}
