/**
 * Детали исключений в JSON клиенту: в production не отдаём (только в логах).
 * Для отладки на проде: EXPOSE_SERVER_ERRORS=1
 */
export function shouldExposeErrorDetails() {
  if (process.env.NODE_ENV !== 'production') return true;
  return String(process.env.EXPOSE_SERVER_ERRORS ?? '').trim() === '1';
}

const DEFAULT_INTERNAL = 'Внутренняя ошибка сервера. Попробуйте позже.';
const DEFAULT_MAIL = 'Не удалось отправить письмо. Попробуйте позже.';

/**
 * @param {unknown} err
 * @param {string} [fallback]
 */
export function clientSafeError(err, fallback = DEFAULT_INTERNAL) {
  if (shouldExposeErrorDetails()) {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    return msg || fallback;
  }
  return fallback;
}

/**
 * Ошибка отправки почты (502): в production без деталей SMTP/API.
 * @param {unknown} err
 */
export function clientSafeMailError(err) {
  if (shouldExposeErrorDetails()) {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    return msg ? `Не удалось отправить письмо: ${msg}` : DEFAULT_MAIL;
  }
  return DEFAULT_MAIL;
}
