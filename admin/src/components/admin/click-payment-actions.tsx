"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClickPaymentActions({
  txnId,
  canReverse,
}: {
  txnId: string;
  canReverse: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function checkStatus() {
    setBusy(true);
    setErr(null);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/payments/${txnId}/click-check`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setStatus(JSON.stringify(data, null, 2));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function reverseViaClick() {
    if (
      !confirm(
        "Click orqali to'lov qaytariladi (kartaga) va hamyondan ham ayiriladi. Davom etilsinmi?",
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/payments/${txnId}/click-reverse`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-1 text-sm font-medium text-white">Click Merchant API</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={checkStatus}
          disabled={busy}
          className="btn-ghost text-sm"
        >
          {busy ? "..." : "Click holatini tekshirish"}
        </button>
        {canReverse && (
          <button
            type="button"
            onClick={reverseViaClick}
            disabled={busy}
            className="btn-primary text-sm"
          >
            {busy ? "..." : "Click orqali qaytarish (kartaga)"}
          </button>
        )}
      </div>
      {status && (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-zinc-300">
          {status}
        </pre>
      )}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
