"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";

/** Click'ning rasmiy fiskal chekini (OFD QR havolasi) so'raydi va ochadi. */
export function ClickReceiptButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/wallet/${id}/click-ofd`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.qrCodeURL) throw new Error(data.error || "Çekni olib bölmadi");
      setQr(data.qrCodeURL);
      window.open(data.qrCodeURL, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card !rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold text-zinc-900">Click rasmiy çeki</span>
          <span className="text-sm text-zinc-500">Soliq qömitasining fiskal çeki</span>
        </span>
        {qr ? (
          <a href={qr} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0 !py-2.5 !text-sm">
            Çekni oçiş <Icon name="external" className="h-4 w-4" />
          </a>
        ) : (
          <button type="button" onClick={load} disabled={busy} className="btn-ghost shrink-0 !py-2.5 !text-sm">
            {busy ? "Yuklanmoqda…" : "Çekni köriş"}
          </button>
        )}
      </div>
      {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
