"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { BoardService } from "@/components/services-board";
import { TopupButton } from "@/components/topup-button";
import { chargeFor, num, som } from "@/lib/format";
import { LINK_HINTS } from "@/lib/kinds";

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

  const presets = [service.min, 100, 500, 1000, 5000, 10000]
    .filter((v, i, a) => v >= service.min && v <= service.max && a.indexOf(v) === i)
    .sort((a, b) => a - b)
    .slice(0, 5);

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
        className="animate-rise max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0e0e16] p-6 shadow-2xl sm:rounded-3xl sm:p-7"
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
            <p className="text-zinc-400">
              Buyurtma berish uchun hisobingizga kiring. tayyorr.uz dagi login va parolingiz shu yerda ham ishlaydi.
            </p>
            <Link href="/login" className="btn-primary w-full">Kirish</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="label !text-sm" htmlFor="link">1. Havolani kiriting</label>
              <input
                id="link"
                className="input !py-3"
                placeholder={LINK_HINTS[service.platform] ?? LINK_HINTS.other}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label !text-sm" htmlFor="qty">
                2. Nechta kerak? <span className="font-normal text-zinc-600">({num(service.min)} – {num(service.max)})</span>
              </label>
              <input
                id="qty"
                className="input !py-3"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                required
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setQuantity(String(v))}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      qty === v
                        ? "border-indigo-400 bg-indigo-500/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {num(v)}
                  </button>
                ))}
              </div>
              {quantity && !qtyOk && (
                <p className="mt-2 text-sm text-amber-300">
                  {num(service.min)} dan {num(service.max)} gacha son kiriting
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Narx (har 1000 tasi)</span>
                <span>{som(service.rate)}</span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-400">
                <span>Hamyoningizda</span>
                <span>{som(balance)}</span>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-white/[0.08] pt-3">
                <span className="text-zinc-300">To&apos;lanadi</span>
                <span className="font-display text-2xl font-semibold text-white">{qtyOk ? som(total) : "—"}</span>
              </div>
            </div>

            {qtyOk && !enough && (
              <p className="text-sm text-amber-300">
                Mablag' yetarli emas.{" "}
                <TopupButton className="underline">Hamyonni to'ldirish</TopupButton>
              </p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}

            <button className="btn-primary w-full !py-3.5 !text-base" disabled={busy || !qtyOk || !enough || !link.trim()}>
              {busy ? "Yuborilmoqda…" : "Buyurtma berish"}
            </button>
            <p className="text-center text-xs text-zinc-500">
              Buyurtma bajarilmasa yoki qisman bajarilsa — pul hamyoningizga avtomatik qaytadi.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
