import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { AssistantMarkdown } from '@/components/AssistantMarkdown';
import { apiFetch } from '@/lib/api';
import { profileInitials } from '@/lib/userDisplay';

const STORAGE_KEY = 'base56-assistant-thread-v1';

const WELCOME_TEXT =
  'Привет! Я ассистент Base56: подскажу по записям и полям, помогу сформулировать запрос. Напишите, что нужно — отвечу здесь.';

/** @returns {{ id: string; role: 'user' | 'assistant'; content: string }} */
function welcomeMessage() {
  return {
    id: 'welcome',
    role: 'assistant',
    content: WELCOME_TEXT,
  };
}

/** @param {unknown} raw */
function parseStoredMessages(raw) {
  try {
    const a = JSON.parse(String(raw));
    if (!Array.isArray(a)) return null;
    /** @type {{ id: string; role: 'user' | 'assistant'; content: string }[]} */
    const out = [];
    for (const x of a) {
      if (
        x &&
        typeof x === 'object' &&
        (x.role === 'user' || x.role === 'assistant') &&
        typeof x.content === 'string'
      ) {
        const id =
          typeof x.id === 'string' && x.id.length > 0
            ? x.id
            : typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `m-${Date.now()}-${out.length}`;
        out.push({ id, role: x.role, content: x.content });
      }
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function loadInitialThread() {
  if (typeof window === 'undefined') return [welcomeMessage()];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [welcomeMessage()];
    const parsed = parseStoredMessages(stored);
    return parsed ?? [welcomeMessage()];
  } catch {
    return [welcomeMessage()];
  }
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Тот же вид, что аватар в сайдбаре (круг с инициалами, класс `user-avatar`).
 * @param {{ currentUser: { email?: string | null, login?: string | null } | null }} props
 */
function AssistantUserAvatar({ currentUser }) {
  return (
    <div className="user-avatar shrink-0" aria-hidden="true">
      {currentUser ? profileInitials(currentUser) : '?'}
    </div>
  );
}

function AssistantTyping() {
  return (
    <div className="asst-msg bot asst-typing-row" aria-live="polite" aria-busy="true">
      <div className="asst-avatar shrink-0" aria-hidden>
        AI
      </div>
      <div className="asst-bubble asst-typing-bubble">
        <span className="asst-typing-dot" />
        <span className="asst-typing-dot" />
        <span className="asst-typing-dot" />
        <span className="sr-only">Ассистент печатает</span>
      </div>
    </div>
  );
}

/**
 * Чат с LLM (OpenRouter на сервере). История — user/assistant для API; в UI — с аватарами и сохранением в браузере.
 * @param {{ currentUser?: { id: string, email: string, login?: string | null } | null }} props
 */
export function AssistantView({ currentUser = null }) {
  const [messages, setMessages] = useState(
    /** @type {{ id: string; role: 'user' | 'assistant'; content: string }[]} */ (
      loadInitialThread
    ),
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const bottomRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const textareaRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));
  /** Базовая высота поля (2 строки), макс = ×3 — задаётся после первого layout */
  const composerMinHRef = useRef(0);
  const composerMaxHRef = useRef(0);
  const messagesRef = useRef(messages);

  const syncComposerTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    const minH = composerMinHRef.current;
    const maxH = composerMaxHRef.current;
    if (!el || !minH || !maxH) return;
    el.style.height = 'auto';
    const sh = el.scrollHeight;
    const clamped = Math.min(Math.max(sh, minH), maxH);
    el.style.height = `${clamped}px`;
    el.style.overflowY = sh > maxH ? 'auto' : 'hidden';
  }, []);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!composerMinHRef.current && el.offsetHeight > 0) {
      const h = el.offsetHeight;
      composerMinHRef.current = h;
      composerMaxHRef.current = Math.round(h * 3);
    }
    syncComposerTextareaHeight();
  }, [input, loading, syncComposerTextareaHeight]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore quota / private mode */
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages, loading]);

  const clearChat = useCallback(() => {
    const fresh = [welcomeMessage()];
    setMessages(fresh);
    setError(null);
    setInput('');
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {
        /* ignore */
      }
    }
    messagesRef.current = fresh;
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    const userMsg = { id: newId(), role: /** @type {'user'} */ ('user'), content: text };
    const prev = messagesRef.current;
    const nextThread = [...prev, userMsg];
    messagesRef.current = nextThread;
    setMessages(nextThread);
    setLoading(true);
    scrollToBottom();
    try {
      const timezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || ''
          : '';
      const apiMessages = nextThread.map(({ role, content }) => ({ role, content }));
      const data = await apiFetch('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: apiMessages, timezone }),
      });
      const content =
        data && typeof data.message === 'object' && typeof data.message.content === 'string'
          ? data.message.content
          : '';
      const assistantMsg = {
        id: newId(),
        role: /** @type {'assistant'} */ ('assistant'),
        content: content || '(пустой ответ)',
      };
      setMessages((p) => {
        const merged = [...p, assistantMsg];
        messagesRef.current = merged;
        return merged;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((p) => {
        const rolled = p.slice(0, -1);
        messagesRef.current = rolled;
        return rolled;
      });
      setInput(text);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, scrollToBottom]);

  return (
    <div className="asst-page flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="asst-shell flex min-h-0 flex-1 flex-col">
        <div className="asst-chat-toolbar shrink-0">
          <button
            type="button"
            className="asst-clear-btn"
            onClick={clearChat}
            title="Удалить историю и начать с приветствия"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Очистить чат
          </button>
        </div>

        <div className="asst-stream flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="asst-stream-inner">
            {messages.map((m) => (
              <div key={m.id} className={`asst-msg ${m.role === 'user' ? 'you' : 'bot'}`}>
                {m.role === 'user' ? (
                  <AssistantUserAvatar currentUser={currentUser} />
                ) : (
                  <div className="asst-avatar shrink-0" aria-hidden>
                    AI
                  </div>
                )}
                <div className="asst-bubble">
                  {m.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : (
                    <AssistantMarkdown text={m.content} />
                  )}
                </div>
              </div>
            ))}
            {loading ? <AssistantTyping /> : null}
            <div ref={bottomRef} className="asst-scroll-anchor" aria-hidden />
          </div>
        </div>

        {error ? (
          <div
            className="mx-4 mb-2 shrink-0 rounded-[var(--radius-sm)] border border-rose-500/35 bg-rose-950/25 px-3 py-2 text-sm text-rose-200 sm:mx-6"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="asst-composer shrink-0">
          <div className="asst-input-row">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Сообщение…"
              className="asst-input"
              disabled={loading}
              aria-label="Сообщение ассистенту"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="btn btn-primary shrink-0 self-end"
            >
              <Send className="h-4 w-4" aria-hidden />
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
