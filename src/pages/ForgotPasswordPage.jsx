import { useState } from 'react';
import { AuthNavLink } from '@/components/AuthNavLink.jsx';
import { apiFetch } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { useAuthPagesDarkTheme } from '@/theme/useAuthPagesDarkTheme.js';

export default function ForgotPasswordPage() {
  useAuthPagesDarkTheme();
  const [email, setEmail] = useState('');
  const [outcome, setOutcome] = useState('form');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Некорректные данные');
      return;
    }
    try {
      const data = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      if (!data || typeof data !== 'object') {
        setError('Не удалось обработать ответ сервера.');
        return;
      }
      if (data.ok === false) {
        if (data.code === 'EMAIL_NOT_FOUND') {
          setError('Аккаунт с таким email не найден. Проверьте адрес или пройдите регистрацию.');
          return;
        }
        if (data.code === 'INVALID_EMAIL' || data.code === 'INVALID_BODY') {
          setError(typeof data.error === 'string' ? data.error : 'Некорректные данные');
          return;
        }
        setError('Не удалось выполнить запрос. Попробуйте позже.');
        return;
      }
      if (data.result === 'verification_resent') {
        setOutcome('verification_resent');
        return;
      }
      if (data.result === 'reset_sent') {
        setOutcome('reset_sent');
        return;
      }
      setError('Не удалось выполнить запрос. Попробуйте позже.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить письмо. Попробуйте позже.');
    }
  }

  const title =
    outcome === 'reset_sent'
      ? 'Письмо отправлено'
      : outcome === 'verification_resent'
        ? 'Сначала подтвердите почту'
        : 'Сброс пароля';

  const subtitle =
    outcome === 'reset_sent'
      ? 'Откройте письмо и перейдите по ссылке — там можно задать новый пароль.'
      : outcome === 'verification_resent'
        ? 'На этот адрес уже заведён аккаунт, но входящие ещё не подтверждены.'
        : 'Укажите email аккаунта — отправим ссылку, чтобы задать новый пароль.';

  return (
    <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">B56</div>
          <div>
            <h1 className="login-title mb-0">{title}</h1>
            <p className="login-sub">{subtitle}</p>
          </div>
        </div>

        {outcome === 'reset_sent' ? (
          <>
            <p className="text-sm text-emerald-400/95 mb-4 rounded-[var(--radius-sm)] border border-emerald-500/25 bg-emerald-950/40 px-3 py-2">
              Ссылка для сброса пароля отправлена на вашу почту. Если письма нет во входящих, загляните в «Спам» —
              иногда фильтры откладывают его туда.
            </p>
            <div className="login-links">
              <AuthNavLink to="/login">Назад ко входу</AuthNavLink>
            </div>
          </>
        ) : outcome === 'verification_resent' ? (
          <>
            <p className="text-sm text-amber-200/95 mb-4 rounded-[var(--radius-sm)] border border-amber-500/30 bg-amber-950/35 px-3 py-2 leading-relaxed">
              Вход возможен только после подтверждения email. Мы отправили письмо со ссылкой для подтверждения ещё
              раз — откройте его и завершите регистрацию. После этого можно снова запросить сброс пароля здесь, если
              нужно.
            </p>
            <p className="text-xs text-center text-[var(--text-muted)] -mt-1 mb-1 px-1 leading-relaxed">
              Если письма нет, подождите минуту-другую и проверьте папку «Спам».
            </p>
            <div className="login-links">
              <AuthNavLink to="/login">Назад ко входу</AuthNavLink>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={onSubmit} className="login-form">
              <div className="field">
                <label className="field-label" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              <button type="submit" className="login-btn">
                Отправить ссылку
              </button>
            </form>
            <div className="login-links">
              <AuthNavLink to="/login">Назад ко входу</AuthNavLink>
            </div>
          </>
        )}
    </div>
  );
}
