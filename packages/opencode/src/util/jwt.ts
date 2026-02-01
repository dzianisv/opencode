export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
    if (payload.exp) {
      // Add a 30 second buffer
      return Date.now() >= (payload.exp - 30) * 1000
    }
  } catch (e) {
    return true
  }
  return false
}
