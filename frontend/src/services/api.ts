import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import router from '@/router'

export interface ApiSuccessEnvelope<T> {
  success: true
  data: T
  timestamp: string
}

export interface ApiErrorEnvelope {
  success: false
  statusCode: number
  message: string
  error: string
  errors?: unknown
  path: string
  timestamp: string
}

// The access token lives ONLY in memory — never localStorage, which any XSS can
// read. On a page reload it's gone; the boot sequence silently re-mints it from
// the httpOnly `refresh_token` cookie via silentRefresh(). This module is the
// single source of truth for the Bearer header.
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/**
 * Session lifecycle hooks the auth store registers so the interceptor can keep
 * the store's reactive state (`token`/`user`, and therefore `isAuthenticated`)
 * in lockstep with what the interceptor does on refresh/expiry. Without this the
 * interceptor could clear the token while the store still believed the user was
 * authenticated — causing a login/redirect loop.
 */
interface SessionHandlers {
  onRefreshed?: (accessToken: string, user: Record<string, unknown>) => void
  onCleared?: () => void
}
let sessionHandlers: SessionHandlers = {}

export function registerSessionHandlers(handlers: SessionHandlers): void {
  sessionHandlers = handlers
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  // Required for the httpOnly `refresh_token` cookie to flow on /auth/refresh
  // and /auth/logout. The browser attaches and stores the cookie automatically;
  // we never touch it from JS.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request: attach Bearer token ────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ── Response: unwrap envelope ───────────────────────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse<ApiSuccessEnvelope<unknown>>) => {
    const body = response.data
    if (body && typeof body === 'object' && 'data' in body) {
      response.data = body.data as never
    }
    return response
  },
  (error: AxiosError<ApiErrorEnvelope>) => handle401(error),
)

// ── 401 → silent refresh once ───────────────────────────────────────────────
interface RetriableRequest extends InternalAxiosRequestConfig {
  _retried?: boolean
}

let refreshInFlight: Promise<string | null> | null = null

function clearSession() {
  accessToken = null
  sessionHandlers.onCleared?.()
}

/**
 * Calls /auth/refresh with `withCredentials` so the browser attaches the
 * `refresh_token` httpOnly cookie. The refresh token itself never enters JS.
 *
 * On success we get a new access token (kept in memory) and the browser stores
 * the rotated refresh cookie transparently. The registered `onRefreshed` hook
 * pushes the fresh token + user into the auth store.
 */
async function performRefresh(): Promise<string | null> {
  try {
    const res = await axios.post<
      ApiSuccessEnvelope<{
        accessToken: string
        user: Record<string, unknown>
      }>
    >(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    const body = res.data.data
    setAccessToken(body.accessToken)
    sessionHandlers.onRefreshed?.(body.accessToken, body.user)
    return body.accessToken
  } catch {
    clearSession()
    return null
  }
}

function redirectToLogin() {
  if (router.currentRoute.value.path !== '/login') {
    // Use Vue Router so we stay inside the SPA — a full `window.location`
    // reload would discard Pinia state and re-bootstrap the whole app.
    router.push('/login')
  }
}

async function handle401(error: AxiosError<ApiErrorEnvelope>): Promise<unknown> {
  const status = error.response?.status
  const original = error.config as RetriableRequest | undefined

  // Don't try to refresh on the refresh/logout calls themselves, or on retries
  // we've already attempted.
  if (
    status !== 401 ||
    !original ||
    original._retried ||
    original.url?.endsWith('/auth/refresh') ||
    original.url?.endsWith('/auth/logout')
  ) {
    if (status === 401) {
      clearSession()
      redirectToLogin()
    }
    return Promise.reject(error)
  }

  original._retried = true

  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  const newToken = await refreshInFlight

  if (!newToken) {
    redirectToLogin()
    return Promise.reject(error)
  }

  original.headers.Authorization = `Bearer ${newToken}`
  return api(original)
}

/**
 * Public helper for the boot sequence — tries to silently restore the session
 * from the `refresh_token` cookie. Returns the new access token on success or
 * null when there's no valid cookie (treat as "not logged in").
 */
export async function silentRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export default api
