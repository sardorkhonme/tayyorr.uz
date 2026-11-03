"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { BoardService } from "@/components/services-board";
import { Icon } from "@/components/icons";
import { TopupButton } from "@/components/topup-button";
import { chargeFor, num, som } from "@/lib/format";
import { LINK_HINTS, splitServiceName } from "@/lib/kinds";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-pop max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{service.category}</p>
            <h3 className="mt-1.5 font-display text-xl font-bold leading-snug text-zinc-900">
              {splitServiceName(service.name).title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {splitServiceName(service.name).tags.slice(0, 6).map((t) => (
                <span key={t} className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" aria-label="Yopish">
            <Icon name="close" />
          </button>
        </div>

        {service.description && (
          <p className="mb-5 max-h-28 overflow-y-auto whitespace-pre-line rounded-2xl bg-zinc-50 p-3.5 text-sm text-zinc-600">
            {service.description}
          </p>
        )}

        {done ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="check" className="h-8 w-8" strokeWidth={2.4} />
            </div>
            <p className="font-display text-xl font-bold text-zinc-900">Buyurtma qabul qilindi!</p>
            <p className="text-sm text-zinc-500">Holatini «Buyurtmalarim» bo'limida kuzatishingiz mumkin.</p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={onClose}>Yopish</button>
              <Link href="/orders" className="btn-primary flex-1">Buyurtmalarim</Link>
            </div>
          </div>
        ) : !loggedIn ? (
          <div className="space-y-3 text-center">
            <p className="text-zinc-600">
              Buyurtma berish uchun hisobingizga kiring. Bitta tayyorr hisobi — barcha xizmatlarda ishlaydi.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/register" className="btn-primary flex-1 !py-3.5">Ro&apos;yxatdan o&apos;tish</Link>
              <Link href="/login" className="btn-ghost flex-1 !py-3.5">Kirish</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="label" htmlFor="link">1. Havolani kiriting</label>
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
              <label className="label" htmlFor="qty">
                2. Nechta kerak? <span className="font-normal text-zinc-400">({num(service.min)} – {num(service.max)})</span>
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
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                      qty === v
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    {num(v)}
                  </button>
                ))}
              </div>
              {quantity && !qtyOk && (
                <p className="mt-2 text-sm text-amber-600">
                  {num(service.min)} dan {num(service.max)} gacha son kiriting
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-zinc-50 p-5 text-[15px]">
              <div className="flex justify-between text-zinc-500">
                <span>Narx (har 1000 tasi)</span>
                <span className="flex items-baseline gap-2">
                  {service.oldRate && <span className="text-zinc-400 line-through">{som(service.oldRate)}</span>}
                  <span className={service.discount ? "font-semibold text-rose-600" : ""}>{som(service.rate)}</span>
                </span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-500">
                <span>Hamyoningizda</span>
                <span>{som(balance)}</span>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-zinc-200 pt-3">
                <span className="font-medium text-zinc-700">To&apos;lanadi</span>
                <span className="font-display text-3xl font-bold text-zinc-900">{qtyOk ? som(total) : "—"}</span>
              </div>
            </div>

            {qtyOk && !enough && (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                Mablag' yetarli emas.{" "}
                <TopupButton className="font-semibold underline">Hamyonni to'ldirish</TopupButton>
              </p>
            )}
            {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>}

            <button className="btn-primary w-full !py-4 !text-base" disabled={busy || !qtyOk || !enough || !link.trim()}>
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
