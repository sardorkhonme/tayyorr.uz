"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";

/**
 * "Akkauntiga kirish" — yangi oynada shu foydalanuvchi sifatida tayyorr+ ochiladi (tekshirish uchun).
 * Oyna bosilgan zahoti ochiladi (brauzer popup'ni bloklamasin), keyin kalit bilan manzil beriladi.
 */
export function ImpersonateButton({ userId, name, compact = false }: { userId: string; name: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useFlashState<string | null>(null);

  async function open() {
    if (
      !confirm(
        `${name} akkauntiga kirasizmi?\n\nYangi oynada uning nomidan tayyorr+, Tayyorr.uz va SMM oçiladi. Bu brauzerda saytga özingizning akkauntingiz bilan kirgan bölsangiz, u almaşadi — tekşirişdan keyin «Çiqiş»ni bosing. Inkognito oyna qulayroq.`,
      )
    )
      return;
    const w = window.open("about:blank", "_blank");
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) throw new Error(d.error || "Kirib bölmadi");
      if (w) w.location.href = d.url;
      else window.location.href = d.url;
    } catch (e) {
      w?.close();
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        title="Yangi oynada şu foydalanuvçi sifatida kiriş (tekşiriş uçun)"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50 ${
          compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
      >
        <Icon name="link" className="h-3.5 w-3.5" />
        {busy ? "Oçilmoqda…" : "Akkauntiga kiriş"}
      </button>
      {err && <span className="flash-status text-xs text-red-300">{err}</span>}
    </span>
  );
}
