import { useState } from 'react';
import { AuthNavLink } from '@/components/AuthNavLink.jsx';
import { PasswordInput } from '@/components/PasswordInput.jsx';
import { apiFetch } from '@/lib/api';
import { registerSchema } from '@/lib/validation';
import { useAuthPagesDarkTheme } from '@/theme/useAuthPagesDarkTheme.js';

export default function RegisterPage() {
  useAuthPagesDarkTheme();
  const [email, setEmail] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResendMsg('');
    const parsed = registerSchema.safeParse({ email, login, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Некорректные данные');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
          ...(parsed.data.login && String(parsed.data.login).trim()
            ? { login: String(parsed.data.login).trim() }
            : {}),
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResendMsg('');
    setError('');
    setResending(true);
    try {
      await apiFetch('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
      setResendMsg('Если аккаунт есть и почта не подтверждена, письмо отправлено.');
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">B56</div>
          <div>
            <h1 className="login-title mb-0">Проверьте почту</h1>
            <p className="login-sub">Подтвердите email, чтобы завершить регистрацию.</p>
          </div>
        </div>
        <p className="text-sm text-emerald-400/95 mb-4 rounded-[var(--radius-sm)] border border-emerald-500/25 bg-emerald-950/40 px-3 py-2 leading-relaxed">
          Мы отправили ссылку на <span className="text-emerald-100/95 font-medium">{email}</span>. Перейдите по ней из
          письма — без подтверждения войти не получится.
        </p>
        <div className="login-links">
          <button
            type="button"
            disabled={resending}
            onClick={() => void resend()}
            className="bg-transparent border-none p-0 cursor-pointer text-[length:inherit] font-[inherit] text-[color:var(--accent)] hover:underline disabled:opacity-50 disabled:pointer-events-none disabled:no-underline"
          >
            {resending ? 'Отправка…' : 'Отправить письмо снова'}
          </button>
          <AuthNavLink to="/login">Ко входу</AuthNavLink>
        </div>
        {resendMsg ? <p className="text-xs text-[var(--text-muted)] text-center mt-3 leading-relaxed">{resendMsg}</p> : null}
      </div>
    );
  }

  return (
    <div className="login-card">
      <div className="login-brand">
        <div className="brand-mark">B56</div>
        <div>
          <h1 className="login-title mb-0">Регистрация</h1>
          <p className="login-sub">Base56 — календарь для специалистов</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="login-form">
          <div className="field">
            <label className="field-label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="reg-login">
              Логин <span className="faint font-normal">— по желанию</span>
            </label>
            <p className="text-[11px] leading-snug text-[var(--text-faint)] -mt-0.5">
              Можно не заполнять — тогда для входа подойдёт имя из вашей почты (то, что до @).
            </p>
            <input
              id="reg-login"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="input w-full"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="reg-password">
              Пароль
            </label>
            <PasswordInput
              id="reg-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-[11px] text-[var(--text-faint)] -mt-1">Не короче 8 символов.</p>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {submitting ? (
            <p className="text-xs text-[var(--text-muted)]">Отправка на сервер — обычно несколько секунд…</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="login-btn disabled:opacity-60 disabled:pointer-events-none disabled:hover:transform-none"
          >
            {submitting ? 'Подождите…' : 'Зарегистрироваться'}
          </button>
        </form>
        <div className="login-links">
          <span className="muted">
            Уже есть аккаунт? <AuthNavLink to="/login">Войти</AuthNavLink>
          </span>
        </div>
    </div>
  );
}
