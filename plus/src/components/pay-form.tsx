"use client";

import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { CLICK_MAX, CLICK_MIN } from "@/lib/click";
import { num } from "@/lib/format";
import { PAY_METHODS, type PayMethod } from "@/lib/pay";
import { useFlashState } from "@/components/flash-status";

const QUICK = [10_000, 25_000, 50_000, 100_000, 200_000, 500_000];
const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://tayyorr.uz";

const TRUST: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: "Xavfsiz tölov", text: "Karta maʼlumotlari saytda saqlanmaydi" },
  { icon: "bolt", title: "Darhol tuşadi", text: "Balans tölovdan söng bir neça soniyada yangilanadi" },
  { icon: "wallet", title: "Bitta hamyon", text: "Barça tayyorr xizmatlarida işlaydi" },
];

/**
 * Yagona to'lov sahifasi (butun ekran): chapda brend panel va jonli summa,
 * o'ngda summa, to'lov tizimi (haqiqiy logolar) va to'lash tugmasi.
 */
export function PayForm({ returnTo, platform }: { returnTo: string; platform: string }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("click");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFlashState<string | null>(null);
  const value = Number(amount.replace(/\D/g, "")) || 0;
  const valid = value >= CLICK_MIN && value <= CLICK_MAX;
  const chosen = PAY_METHODS.find((m) => m.key === method)!;

  async function pay() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, method, returnTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.payUrl) throw new Error(data.error || "Tölovni boşlab bölmadi");
      window.location.href = data.payUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ---------- chap: brend panel ---------- */}
      <aside className="relative isolate flex flex-col overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 pb-8 pt-6 text-white sm:px-10 lg:px-14 lg:py-12">

        <div className="flex items-center justify-between gap-3">
          <a href={returnTo} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25">
            <Icon name="arrow-left" className="h-4 w-4" /> Orqaga
          </a>
          <span className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ffffff] shadow-lg shadow-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/plus-mark.png" alt="" className="h-7 w-7 object-contain" />
            </span>
            <span className="font-display text-lg font-bold">tayyorr+</span>
          </span>
        </div>

        <div className="mt-8 lg:my-auto">
          <p className="text-sm font-medium text-indigo-100">{platform} · hamyon</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">Hamyonni töldiriş</h1>

          {/* jonli summa kartasi */}
          <div className="mt-6 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md sm:p-6 lg:mt-10">
            <p className="text-sm text-indigo-100">Tölanadigan summa</p>
            <p className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {num(value)} <span className="text-2xl font-semibold text-indigo-100">söm</span>
            </p>
            <div className="mt-4 flex items-center gap-3 border-t border-white/15 pt-4 text-sm">
              <span className="grid h-9 w-14 place-items-center rounded-lg bg-[#ffffff] px-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={chosen.logo} alt={chosen.name} className="max-h-6 w-auto object-contain" />
              </span>
              <span className="text-indigo-50">{chosen.name} orqali</span>
            </div>
          </div>
        </div>

        <ul className="mt-8 hidden gap-4 lg:grid">
          {TRUST.map((t) => (
            <li key={t.title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
                <Icon name={t.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold">{t.title}</span>
                <span className="text-sm text-indigo-100">{t.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- o'ng: forma ---------- */}
      <section className="flex min-w-0 flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full min-w-0 max-w-lg">
          <label className="text-sm font-semibold text-zinc-900" htmlFor="amount">
            Summani kiriting
          </label>
          <div className="mt-3 flex items-baseline gap-3 border-b-2 border-zinc-200 pb-3 transition focus-within:border-indigo-500">
            <input
              id="amount"
              inputMode="numeric"
              autoFocus
              className="min-w-0 flex-1 bg-transparent font-display text-5xl font-bold tracking-tight text-zinc-900 outline-none placeholder:text-zinc-300"
              placeholder="0"
              value={value ? num(value) : ""}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="font-display text-2xl font-semibold text-zinc-400">söm</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  value === q
                    ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/25"
                    : "bg-zinc-100 text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {num(q)}
              </button>
            ))}
          </div>

          <p className="mt-10 text-sm font-semibold text-zinc-900">Tölov usuli</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {PAY_METHODS.map((m) => {
              const active = method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  disabled={!m.ready}
                  onClick={() => setMethod(m.key)}
                  className={`relative flex h-28 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 bg-[#ffffff] px-2 transition ${
                    active
                      ? "border-indigo-500 shadow-lg shadow-indigo-500/15"
                      : "border-zinc-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                  } disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.logo}
                    alt={m.name}
                    className={`w-auto max-w-[85%] object-contain ${m.logoClass} ${m.ready ? "" : "opacity-40 grayscale"}`}
                  />
                  {m.showName && <span className="text-xs font-semibold text-[#71717b]">{m.name}</span>}
                  {!m.ready && (
                    <span className="rounded-full bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-semibold text-[#71717b]">Tez orada</span>
                  )}
                  {active && (
                    <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-indigo-500 text-white">
                      <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {error && <p className="flash-status mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          <button type="button" onClick={pay} disabled={!valid || busy} className="btn-primary mt-10 w-full !rounded-2xl !py-4 !text-base">
            {busy ? (
              "Yönaltirilmoqda…"
            ) : (
              <>
                <Icon name="shield" className="h-5 w-5" />
                {valid ? `${num(value)} söm tölaş` : "Tölaş"}
              </>
            )}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
            {value > 0 && !valid
              ? `Summa ${num(CLICK_MIN)} – ${num(CLICK_MAX)} söm oraliğida bölsin`
              : (
                <>
                  Tölaş orqali{" "}
                  <a href={`${MAIN_URL}/terms`} target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-800">
                    ommaviy oferta
                  </a>{" "}
                  şartlariga rozilik bildirasiz.
                </>
              )}
          </p>

          {/* telefonda ishonch belgilari pastda */}
          <ul className="mt-10 grid gap-3 border-t border-zinc-100 pt-6 lg:hidden">
            {TRUST.map((t) => (
              <li key={t.title} className="flex items-center gap-3 text-sm text-zinc-600">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon name={t.icon} className="h-4 w-4" />
                </span>
                {t.text}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
