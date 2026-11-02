"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { googleAction, loginAction, registerAction, type AuthState } from "./actions";

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

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-zinc-400">
      <span className="h-px flex-1 bg-zinc-200" /> yoki email bilan <span className="h-px flex-1 bg-zinc-200" />
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
        {show ? "Yashirish" : "Ko'rsatish"}
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
      <h1 className="font-display text-2xl font-bold text-zinc-900">Xush kelibsiz!</h1>
      <p className="mb-6 mt-1.5 text-zinc-500">tayyorr.uz hisobingiz ham shu yerda ishlaydi.</p>

      <GoogleButton label="Google bilan kirish" />
      <Divider />

      <form action={action} className="space-y-5">
        <div>
          <label className="label" htmlFor="identifier">Email yoki login</label>
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
          {pending ? "Kirilmoqda…" : "Kirish"}
        </button>
      </form>

      <p className="mt-6 text-center text-[15px] text-zinc-500">
        Hisobingiz yo&apos;qmi?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
          Ro&apos;yxatdan o&apos;ting
        </Link>
      </p>
    </>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-zinc-900">Hisob yarating</h1>
      <p className="mb-6 mt-1.5 text-zinc-500">Bir daqiqa — va birinchi buyurtmani berishingiz mumkin.</p>

      <GoogleButton label="Google bilan davom etish" />
      <Divider />

      <form action={action} className="space-y-5">
        {/* bot tuzog'i */}
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <div>
          <label className="label" htmlFor="firstName">Ismingiz</label>
          <input
            id="firstName"
            name="firstName"
            className="input"
            autoComplete="given-name"
            defaultValue={state.values?.firstName}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="siz@gmail.com"
            defaultValue={state.values?.email}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Parol <span className="font-normal text-zinc-400">(kamida 6 belgi)</span>
          </label>
          <PasswordInput autoComplete="new-password" />
        </div>
        <ErrorBox text={state.error} />
        <button className="btn-primary w-full !py-4 !text-base" disabled={pending}>
          {pending ? "Yaratilmoqda…" : "Ro'yxatdan o'tish"}
        </button>
      </form>

      <p className="mt-6 text-center text-[15px] text-zinc-500">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Kirish
        </Link>
      </p>
    </>
  );
}
