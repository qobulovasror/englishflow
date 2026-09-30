// Access tokens deliberately stay in module memory. The refresh credential is
// an httpOnly cookie and must never be copied into Web Storage.
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}
