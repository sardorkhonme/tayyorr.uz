"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { num, som } from "@/lib/format";

const QUICK = [10_000, 25_000, 50_000, 100_000, 200_000];

/** Hamyonni Click orqali to'ldirish oynasini ochadigan tugma. */
export function TopupButton({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} title={title} onClick={() => setOpen(true)}>
        {children}
      </button>
      {/* portal: header (backdrop-filter) va modal (transform) ichida fixed qirqilmasin */}
      {open && createPortal(<TopupDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function TopupDialog({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("50000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const value = Number(amount) || 0;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: value }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.payUrl) {
      setBusy(false);
      setError(data?.error ?? "Tarmoq xatosi, qayta urinib ko'ring");
      return;
    }
    window.location.href = data.payUrl;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={pay}
        onClick={(e) => e.stopPropagation()}
        className="animate-rise w-full max-w-sm space-y-4 rounded-t-2xl border border-white/10 bg-[#0e0e16] p-5 text-left shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">Hamyonni to'ldirish</h3>
            <p className="mt-0.5 text-sm text-zinc-500">Click orqali — tayyorr.uz hamyoningizga tushadi</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Yopish">
            ✕
          </button>
        </div>

        <div>
          <label className="label" htmlFor="topup-amount">Summa (so'm)</label>
          <input
            id="topup-amount"
            className="input !text-lg"
            inputMode="numeric"
            value={amount ? num(value) : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  value === q
                    ? "border-indigo-400 bg-indigo-500/20 text-white"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                }`}
              >
                {num(q)}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button className="btn-primary w-full !py-3" disabled={busy || value < 1000}>
          {busy ? "Click ochilmoqda…" : `${som(value)} — Click orqali to'lash`}
        </button>
        <p className="text-center text-xs text-zinc-600">To'lovdan keyin shu saytga qaytasiz, balans avtomatik yangilanadi.</p>
      </form>
    </div>
  );
}
