// Session helpers for future integration; do not clear or replace existing sessions.
export function isExpiring(session, skewMs=60000) {
  if (!session?.access_token) return true;
  if (!session.expires_at) return false;
  const expiry=Number(session.expires_at);
  const expiresMs=expiry < 1e11 ? expiry*1000 : expiry;
  return Date.now()+skewMs >= expiresMs;
}
export async function getValidSession(session, refresh) {
  if (!isExpiring(session)) return session;
  if (!session?.refresh_token) throw new Error('Session refresh token unavailable');
  return refresh(session.refresh_token);
}
