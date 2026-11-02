"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Login yoki parol xato");
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080d] px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-7"
      >
        <h1 className="text-lg font-semibold text-white">Admin panel</h1>
        <p className="mt-1 text-sm text-zinc-500">tayyorr.uz boshqaruvi</p>

        <div className="mt-6 flex flex-col gap-3">
          <div>
            <label className="label">Login</label>
            <input
              className="input"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Parol</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button className="btn-primary" disabled={busy}>
            {busy ? "..." : "Kirish"}
          </button>
        </div>
      </form>
    </main>
  );
}
