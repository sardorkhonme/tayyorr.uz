"use client";

import { useState } from "react";

/**
 * Click'ning rasmiy fiskal chekini (OFD QR havolasi) so'rab, topilsa
 * havolani ko'rsatadi. Ham admin, ham foydalanuvchi sahifalarida
 * ishlatiladi — faqat apiBase farq qiladi.
 */
export function ClickReceiptButton({ apiBase }: { apiBase: string }) {
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function fetchReceipt() {
    setBusy(true);
    setErr(null);
    setQr(null);
    try {
      const res = await fetch(`${apiBase}/click-ofd`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setQr(data.qrCodeURL);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="text-sm font-medium text-white">Click cheki</div>
      <button
        type="button"
        onClick={fetchReceipt}
        disabled={busy}
        className="btn-ghost w-fit text-sm"
      >
        {busy ? "..." : "Click chekini ko'rish"}
      </button>
      {qr && (
        <a
          href={qr}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-fit text-sm"
        >
          Rasmiy chekni ochish ↗
        </a>
      )}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
