/**
 * Инициалы для аватара в UI (сайдбар, чат ассистента).
 * @param {{ login?: string | null, email?: string | null }} user
 */
export function profileInitials(user) {
  const login = user.login?.trim();
  if (login && login.length >= 2) return login.slice(0, 2).toUpperCase();
  if (login) return login.slice(0, 1).toUpperCase();
  const local = user.email?.split('@')[0]?.trim() || '';
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return (local[0] || '?').toUpperCase();
}
