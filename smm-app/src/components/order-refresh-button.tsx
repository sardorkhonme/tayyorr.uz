"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";

/** Statistikani provayder API'dan darhol yangilaydi (sahifa o'zi ham 30 soniyada yangilanadi). */
export function OrderRefreshButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useFlashState<{ ok: boolean; text: string } | null>(null);
  const loading = busy || pending;

  async function refresh() {
    if (loading) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/refresh`, { method: "POST" });
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
      setMsg({ ok: true, text: "Yangilandi" });
    } catch {
      setMsg({ ok: false, text: "Yangilab bölmadi" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100 transition hover:bg-indigo-100 disabled:opacity-70"
      >
        <Icon name="refresh" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Yangilanmoqda…" : "Yangilaş"}
      </button>
      {msg && <span className={`flash-status text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</span>}
    </span>
  );
}
