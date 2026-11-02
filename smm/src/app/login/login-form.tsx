"use client";

import { useActionState } from "react";

import { googleAction, loginAction, type LoginState } from "./actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {
    error: initialError,
  });

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="identifier">Login yoki email</label>
          <input id="identifier" name="identifier" className="input" autoComplete="username" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Parol</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button className="btn-primary w-full !py-3" disabled={pending}>
          {pending ? "Kirilmoqda…" : "Kirish"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span className="h-px flex-1 bg-white/10" /> yoki <span className="h-px flex-1 bg-white/10" />
      </div>

      <form action={googleAction}>
        <button className="btn-ghost w-full !py-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
          </svg>
          Google bilan kirish
        </button>
      </form>
    </div>
  );
}
