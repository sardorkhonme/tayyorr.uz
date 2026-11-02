"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { CLICK_MAX, CLICK_MIN } from "@/lib/click";
import { num } from "@/lib/format";
import { PAY_METHODS, type PayMethod } from "@/lib/pay";

const QUICK = [10_000, 25_000, 50_000, 100_000, 200_000, 500_000];

/** To'lov formasi: summa + to'lov tizimi → tanlangan tizim sahifasiga o'tadi. */
export function PayForm({ returnTo, platform }: { returnTo: string; platform: string }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("click");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount.replace(/\D/g, "")) || 0;
  const valid = value >= CLICK_MIN && value <= CLICK_MAX;

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
      if (!res.ok || !data.payUrl) throw new Error(data.error || "To'lovni boshlab bo'lmadi");
      window.location.href = data.payUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
      setBusy(false);
    }
  }

  return (
    <div className="card !rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <a href={returnTo} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900">
          <Icon name="arrow-left" className="h-4 w-4" /> Orqaga
        </a>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">{platform}</span>
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold text-zinc-900">Hamyonni to&apos;ldirish</h1>

      {/* summa */}
      <label className="label mt-6" htmlFor="amount">
        Summa
      </label>
      <div className="relative">
        <input
          id="amount"
          inputMode="numeric"
          autoFocus
          className="input !py-4 pr-16 font-display !text-2xl font-bold"
          placeholder="0"
          value={value ? num(value) : ""}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">so&apos;m</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setAmount(String(q))}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              value === q ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-600 hover:border-indigo-200"
            }`}
          >
            {num(q)}
          </button>
        ))}
      </div>

      {/* to'lov tizimi */}
      <p className="label mt-7">To&apos;lov usuli</p>
      <div className="grid gap-2.5">
        {PAY_METHODS.map((m) => {
          const active = method === m.key;
          return (
            <button
              key={m.key}
              type="button"
              disabled={!m.ready}
              onClick={() => setMethod(m.key)}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                active ? "border-indigo-400 bg-indigo-50/60 ring-4 ring-indigo-100" : "border-zinc-200 hover:border-zinc-300"
              } disabled:cursor-not-allowed disabled:opacity-55`}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-sm font-bold text-white"
                style={{ background: m.color }}
              >
                {m.name.slice(0, 1)}
              </span>
              <span className="flex-1 font-semibold text-zinc-900">{m.name}</span>
              {m.ready ? (
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                    active ? "border-indigo-500 bg-indigo-500 text-white" : "border-zinc-300"
                  }`}
                >
                  {active && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">Tez orada</span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button type="button" onClick={pay} disabled={!valid || busy} className="btn-primary mt-7 w-full !py-4 !text-base">
        {busy ? "Yo'naltirilmoqda…" : valid ? `${num(value)} so'm to'lash` : "To'lash"}
      </button>
      {!valid && value > 0 && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Summa {num(CLICK_MIN)} – {num(CLICK_MAX)} so&apos;m oralig&apos;ida bo&apos;lsin
        </p>
      )}
    </div>
  );
}
