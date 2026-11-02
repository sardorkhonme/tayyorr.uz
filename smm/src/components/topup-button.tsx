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
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/30 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={pay}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop w-full max-w-md space-y-5 rounded-t-3xl bg-white p-6 text-left shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold text-zinc-900">Hamyonni to'ldirish</h3>
            <p className="mt-1 text-sm text-zinc-500">Click orqali — tayyorr.uz va tayyorr+ uchun bitta hamyon</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" aria-label="Yopish">
            ✕
          </button>
        </div>

        <div>
          <label className="label" htmlFor="topup-amount">Summa (so'm)</label>
          <input
            id="topup-amount"
            className="input !py-3.5 font-display !text-2xl font-semibold"
            inputMode="numeric"
            value={amount ? num(value) : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  value === q
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {num(q)}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button className="btn-primary w-full !py-4 !text-base" disabled={busy || value < 1000}>
          {busy ? "Click ochilmoqda…" : `${som(value)} — Click orqali to'lash`}
        </button>
        <p className="text-center text-xs text-zinc-500">To'lovdan keyin shu saytga qaytasiz, balans avtomatik yangilanadi.</p>
      </form>
    </div>
  );
}
