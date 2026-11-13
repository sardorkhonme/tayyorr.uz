"use client";

import { useState } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";

import { WelcomeOverlay } from "@/components/session-overlay";

import { AuthShell } from "@/components/auth-shell";
import { BrandLoaderOverlay } from "@/components/brand-loader";
import { useGoogleSignIn } from "@/components/use-google-sign-in";
import { PasswordInput } from "@/components/password-input";
import { useFlashState } from "@/components/flash-status";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useFlashState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);
  const google = useGoogleSignIn();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    let res: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      res = await signIn("credentials", {
        login,
        password,
        redirect: false,
      });
    } catch {
      setBusy(false);
      setErr("Server bilan bog'lanib bölmadi. Internetni tekşirib, qayta urinib köring.");
      return;
    }
    if (!res || res.error) {
      setBusy(false);
      setErr(res ? "Login yoki parol xato" : "Server javob bermadi. Qayta urinib köring.");
      return;
    }
    // salomlaşiş animatsiyasi (öqiş uçun ~3 s), so'ng ilovaga
    const session = await getSession().catch(() => null);
    const name = session?.user?.name?.trim().split(/\s+/)[0] || login.trim() || "döstim";
    setWelcome(name);
  }

  return (
    <AuthShell width="max-w-sm">
      {google.busy && <BrandLoaderOverlay label="Google'ga yönaltirilmoqda…" />}
      {welcome && <WelcomeOverlay name={welcome} onDone={() => window.location.assign("/dashboard")} />}
      <div className="card p-7">
        <h1 className="text-xl font-semibold text-white">Kiriş</h1>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <div>
            <label className="label">Login yoki email</label>
            <input
              className="input"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Parol</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <p className="flash-status text-sm text-red-400">{err}</p>}
          <button className="btn-primary mt-1" disabled={busy}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="spin-ring" aria-hidden />
                Tekşirilmoqda…
              </span>
            ) : (
              "Kiriş"
            )}
          </button>
        </form>

        {/* Google orqali kirish — doim pastda (mobil ilova bilan bir xil) */}
        <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
          <span className="h-px flex-1 bg-white/10" />
          yoki
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          className="btn-white w-full"
          disabled={google.busy}
          onClick={() => google.start("/dashboard")}
        >
          <GoogleGlyph />
          {google.busy ? "Yönaltirilmoqda…" : "Google orqali kiriş"}
        </button>
        {google.error && (
          <p role="alert" className="flash-status mt-3 text-center text-sm text-red-400">
            {google.error}
          </p>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-zinc-500">
        Akkountingiz yöqmi?{" "}
        <Link href="/register" className="text-indigo-400 hover:text-indigo-300">
          Röyxatdan ötiş
        </Link>
      </p>
    </AuthShell>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
