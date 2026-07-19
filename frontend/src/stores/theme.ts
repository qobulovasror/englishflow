import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(getInitialTheme())

  function getInitialTheme(): boolean {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function toggle() {
    isDark.value = !isDark.value
  }

  watch(
    isDark,
    (dark) => {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', dark)
    },
    { immediate: true },
  )

  return { isDark, toggle }
})
