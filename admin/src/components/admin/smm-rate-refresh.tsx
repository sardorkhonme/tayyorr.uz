"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFlashState } from "@/components/flash-status";

/** Dollar kursini Markaziy bankdan hozir qayta olish. */
export function SmmRateRefresh() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useFlashState<{ ok: boolean; text: string } | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/smm-settings/rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setMsg({ ok: true, text: "Kurs yangilandi" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" disabled={busy} onClick={refresh}>
        {busy ? "..." : "Kursni hozir yangilaş"}
      </button>
      {msg && <span className={`flash-status text-xs ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>}
    </div>
  );
}
