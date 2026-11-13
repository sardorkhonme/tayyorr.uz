"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";

/** Provayder (smmcloud) hisobidagi pul — "Yangilash" bosilganda tekshiriladi. */
export function SmmProviderBalance({
  name,
  usd,
  fx,
  checkedAt,
  addFundsUrl,
}: {
  name: string;
  usd: number | null;
  fx: number | null;
  checkedAt: string | null;
  addFundsUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFlashState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/smm-settings/balance", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xatolik");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  const low = usd !== null && usd < 1;

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Icon name="wallet" className="h-4 w-4" />
          {name} hisobi
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "Tekşirilmoqda…" : "Yangilaş"}
        </button>
      </div>
      <span className={`mt-1 text-3xl font-semibold ${low ? "text-red-300" : "text-white"}`}>
        {usd === null ? "—" : `$${usd.toFixed(2)}`}
      </span>
      <span className="text-xs text-zinc-500">
        {usd !== null && fx ? `≈ ${Math.round(usd * fx).toLocaleString("ru-RU")} söm · ` : ""}
        {checkedAt
          ? `tekşirildi: ${new Date(checkedAt).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
          : "hali tekşirilmagan"}
      </span>
      {error && <span className="flash-status mt-1 text-xs text-red-300">{error}</span>}
      {addFundsUrl && (
        <a href={addFundsUrl} target="_blank" rel="noreferrer" className="mt-2 text-xs text-indigo-400 hover:underline">
          Hisobni töldiriş →
        </a>
      )}
    </div>
  );
}
