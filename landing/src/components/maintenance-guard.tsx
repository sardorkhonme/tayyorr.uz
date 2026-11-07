"use client";

import { useEffect, useRef, useState } from "react";

import { APP_URL } from "@/lib/links";

type State = { on: boolean; message: string; allowed: boolean };

/**
 * "Texnik ishlar" rejimi (admin yoqadi): landing ishlayveradi, lekin app / tayyorr+ / SMM ga
 * o'tish (kirish, ro'yxatdan o'tish, xizmatlar) bosilganda o'tish o'rniga xabar chiqadi.
 * Ruxsat ro'yxatidagi foydalanuvchi (SSO cookie bo'yicha) odatdagidek o'tadi.
 */
export function MaintenanceGuard() {
  const state = useRef<State | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(`${APP_URL}/api/public/maintenance`, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: State | null) => {
          if (d) state.current = d;
        })
        .catch(() => {});
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);

    // capture — o'tish animatsiyasidan (PlatformTransition) oldin ushlaymiz
    const onClick = (e: MouseEvent) => {
      const s = state.current;
      if (!s?.on || s.allowed) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (!/^(app|plus|smm)\.tayyorr\.uz$/i.test(url.hostname)) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(s.message);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[2147483001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={() => setOpen(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#121219] p-7 text-center shadow-2xl shadow-indigo-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/15 text-3xl">🛠️</div>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
          Texnik işlar
        </span>
        <h2 className="mt-3 text-xl font-bold text-white">Tez orada qaytamiz</h2>
        <p className="mt-2 leading-relaxed text-zinc-400">{open}</p>
        <button
          type="button"
          onClick={() => setOpen(null)}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 font-semibold text-white"
        >
          Tuşunarli
        </button>
      </div>
    </div>
  );
}
