"use client";

const PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

/**
 * Hamyonni to'ldirish — barcha platformalar uchun yagona to'lov sahifasi (plus.tayyorr.uz/pay).
 * To'lovdan keyin foydalanuvchi shu sahifaga qaytadi. Usullar: Click (Payme, Uzum — tez orada).
 */
export function WalletTopUp() {
  function open() {
    const url = new URL("/pay", PLUS_URL);
    url.searchParams.set("return", window.location.href);
    window.location.href = url.toString();
  }

  return (
    <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-white">Hisobni töldiriş</h2>
        <p className="mt-1 text-xs text-zinc-500">Click · Payme va Uzum tez orada. Karta maʼlumotlari saytda saqlanmaydi.</p>
      </div>
      <button type="button" onClick={open} className="btn-primary shrink-0">
        Hamyonni töldiriş
      </button>
    </div>
  );
}
