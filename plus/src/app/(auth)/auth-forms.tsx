"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { googleAction, loginAction, resendOtpAction, sendOtpAction, verifyOtpAction, type AuthState } from "./actions";

function GoogleButton({ label }: { label: string }) {
  return (
    <form action={googleAction}>
      <button className="btn-ghost w-full !py-3.5">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        {label}
      </button>
    </form>
  );
}

function Divider({ label = "yoki" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-zinc-400">
      <span className="h-px flex-1 bg-zinc-200" /> {label} <span className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}

function PasswordInput({ autoComplete }: { autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={show ? "text" : "password"}
        className="input pr-20"
        autoComplete={autoComplete}
        minLength={6}
        required
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      >
        {show ? "Yaşiriş" : "Körsatiş"}
      </button>
    </div>
  );
}

function ErrorBox({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{text}</p>;
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, { error: initialError });
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-zinc-900">Xuş kelibsiz!</h1>
      <p className="mb-6 mt-1.5 text-zinc-500">Bitta hisob — barça tayyorr xizmatlarida.</p>

      <form action={action} className="space-y-5">
        <div>
          <label className="label" htmlFor="identifier">Login yoki email</label>
          <input
            id="identifier"
            name="identifier"
            className="input"
            autoComplete="username"
            defaultValue={state.values?.identifier}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Parol</label>
          <PasswordInput autoComplete="current-password" />
        </div>
        <ErrorBox text={state.error} />
        <button className="btn-primary w-full !py-4 !text-base" disabled={pending}>
          {pending ? "Kirilmoqda…" : "Kiriş"}
        </button>
      </form>

      <Divider />
      <GoogleButton label="Google bilan kiriş" />

      <p className="mt-6 text-center text-[15px] text-zinc-500">
        Hisobingiz yöqmi?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
          Röyxatdan öting
        </Link>
      </p>
    </>
  );
}

/** Ro'yxatdan o'tish (1-sahifa): email → kod yuborish; pastida Google. Qolgani keyingi sahifalarda. */
export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(sendOtpAction, {});
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-zinc-900">Hisob yarating</h1>
      <p className="mb-6 mt-1.5 text-zinc-500">Emailingizni kiriting — unga 4 xonali kod yuboramiz.</p>

      <form action={action} className="space-y-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className="input"
            autoComplete="email"
            placeholder="siz@gmail.com"
            defaultValue={state.values?.email}
            required
          />
        </div>
        <ErrorBox text={state.error} />
        <button className="btn-primary w-full !py-4 !text-base" disabled={pending}>
          {pending ? "Yuborilmoqda…" : "Kod yuboriş"}
        </button>
      </form>

      <Divider />
      <GoogleButton label="Google bilan röyxatdan ötiş" />

      <p className="mt-7 text-center text-[15px] text-zinc-500">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Kiriş
        </Link>
      </p>
    </>
  );
}

/** Ro'yxatdan o'tish (2-sahifa): emailga kelgan 4 xonali kod. */
export function OtpForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyOtpAction, {});
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [wait, setWait] = useState(60);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [resending, setResending] = useState(false);
  const code = digits.join("");

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // xato bo'lsa — kod tozalanadi, birinchi katakka qaytadi
  useEffect(() => {
    if (state.error) {
      setDigits(["", "", "", ""]);
      refs.current[0]?.focus();
    }
  }, [state]);

  function put(i: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (v.length > 1) {
      // nusxa qo'yildi (yoki SMS/email avto-to'ldirish)
      const next = v.slice(0, 4).split("");
      while (next.length < 4) next.push("");
      setDigits(next);
      refs.current[Math.min(v.length, 4) - 1]?.focus();
      if (v.length >= 4) setTimeout(() => formRef.current?.requestSubmit(), 0);
      return;
    }
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 3) refs.current[i + 1]?.focus();
    if (v && next.every(Boolean)) setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  async function resend() {
    setResending(true);
    setNote(null);
    const r = await resendOtpAction(email);
    setResending(false);
    if (r.ok) {
      setWait(60);
      setDigits(["", "", "", ""]);
      refs.current[0]?.focus();
      setNote({ ok: true, text: "Yangi kod yuborildi" });
    } else {
      if (r.waitSec) setWait(r.waitSec);
      setNote({ ok: false, text: r.error ?? "Yuborilmadi" });
    }
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-zinc-900">Emailingizni tekşiring</h1>
      <p className="mb-6 mt-1.5 text-zinc-500">
        <b className="font-semibold text-zinc-800">{email}</b> manziliga 4 xonali kod yuborildi.
      </p>

      <form ref={formRef} action={action} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={code} />
        <div className="flex justify-center gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => put(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              autoFocus={i === 0}
              aria-label={`${i + 1}-raqam`}
              className="h-16 w-14 rounded-2xl border border-zinc-200 bg-white text-center text-2xl font-bold text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            />
          ))}
        </div>
        <ErrorBox text={state.error} />
        <button className="btn-primary w-full !py-4 !text-base" disabled={pending || code.length !== 4}>
          {pending ? "Tekşirilmoqda…" : "Tasdiqlaş"}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-[15px] text-zinc-500">
        {wait > 0 ? (
          <span>
            Kodni qayta yuboriş: <b className="tabular-nums text-zinc-700">0:{String(wait).padStart(2, "0")}</b>
          </span>
        ) : (
          <button type="button" onClick={resend} disabled={resending} className="font-semibold text-indigo-600 hover:underline disabled:opacity-50">
            {resending ? "Yuborilmoqda…" : "Kodni qayta yuboriş"}
          </button>
        )}
        {note && <span className={`text-sm ${note.ok ? "text-emerald-600" : "text-red-600"}`}>{note.text}</span>}
        <span className="text-sm text-zinc-400">Xat kelmadimi? «Spam» papkasini ham tekşiring.</span>
        <Link href="/register" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
          ← Emailni özgartiriş
        </Link>
      </div>
    </>
  );
}
