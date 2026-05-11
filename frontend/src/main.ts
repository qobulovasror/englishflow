import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import './assets/main.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // Restore the session from the `refresh_token` cookie BEFORE the router
  // mounts — otherwise router guards see `isAuthenticated = false` on a
  // valid reload and bounce the user to /login.
  const authStore = useAuthStore()
  await authStore.tryRestore()

  app.use(router)
  app.mount('#app')
}

bootstrap()
