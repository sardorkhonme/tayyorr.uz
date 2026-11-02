"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { BoardService } from "@/components/services-board";
import { TopupButton } from "@/components/topup-button";
import { chargeFor, num, som } from "@/lib/format";

export function OrderDialog({
  service,
  loggedIn,
  balance,
  onClose,
  onOrdered,
}: {
  service: BoardService;
  loggedIn: boolean;
  balance: number;
  onClose: () => void;
  onOrdered: (balance: number) => void;
}) {
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState(String(service.min));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const qty = Number(quantity) || 0;
  const qtyOk = qty >= service.min && qty <= service.max;
  const total = qtyOk ? chargeFor(service.rate, qty) : 0;
  const enough = total <= balance;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ serviceId: service.id, link, quantity: qty }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error ?? "Tarmoq xatosi, qayta urinib ko'ring");
      return;
    }
    onOrdered(data.balance);
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-rise w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0e0e16] p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{service.category}</p>
            <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-white">{service.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Yopish">
            ✕
          </button>
        </div>

        {service.description && (
          <p className="mb-4 max-h-28 overflow-y-auto whitespace-pre-line rounded-xl bg-white/[0.03] p-3 text-sm text-zinc-400">
            {service.description}
          </p>
        )}

        {done ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-2xl text-emerald-300">✓</div>
            <p className="text-white">Buyurtma qabul qilindi!</p>
            <p className="text-sm text-zinc-500">Holatini «Buyurtmalarim» bo'limida kuzatishingiz mumkin.</p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={onClose}>Yopish</button>
              <Link href="/orders" className="btn-primary flex-1">Buyurtmalarim</Link>
            </div>
          </div>
        ) : !loggedIn ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-zinc-400">Buyurtma berish uchun tayyorr.uz hisobingiz bilan kiring.</p>
            <Link href="/login" className="btn-primary w-full">Kirish</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="link">Havola (link)</label>
              <input
                id="link"
                className="input"
                placeholder="https://instagram.com/username"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="qty">
                Miqdor <span className="text-zinc-600">({num(service.min)} – {num(service.max)})</span>
              </label>
              <input
                id="qty"
                className="input"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Narx (1000 dona)</span>
                <span>{som(service.rate)}</span>
              </div>
              <div className="mt-1 flex justify-between text-zinc-400">
                <span>Hamyonda</span>
                <span>{som(balance)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-white/[0.07] pt-2 font-medium text-white">
                <span>Jami</span>
                <span>{qtyOk ? som(total) : "—"}</span>
              </div>
            </div>

            {qtyOk && !enough && (
              <p className="text-sm text-amber-300">
                Mablag' yetarli emas.{" "}
                <TopupButton className="underline">Hamyonni to'ldirish</TopupButton>
              </p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}

            <button className="btn-primary w-full !py-3" disabled={busy || !qtyOk || !enough || !link.trim()}>
              {busy ? "Yuborilmoqda…" : qtyOk ? `${som(total)} — Buyurtma berish` : "Buyurtma berish"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
