"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Icon } from "@/components/icons";

/** SMM buyurtma statistikasini provayderdan hozir yangilaydi (orderId bo'lmasa — barcha faol buyurtmalar). */
export function SmmOrderRefresh({ orderId, label = "Yangilaş" }: { orderId?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const loading = busy || pending;

  async function refresh() {
    if (loading) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/smm-orders/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(orderId ? { orderId } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xatolik");
      startTransition(() => router.refresh());
      setMsg({ ok: true, text: "Yangilandi" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Xatolik" });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {msg && <span className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</span>}
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
      >
        <Icon name="refresh" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Yangilanmoqda…" : label}
      </button>
    </span>
  );
}
