"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** To'lov tizimlari foizi — o'zgartirilsa butun Moliya qayta hisoblanadi. */
export function FinanceSettingsForm({ clickPct, paymePct }: { clickPct: number; paymePct: number }) {
  const router = useRouter();
  const [click, setClick] = useState(String(clickPct));
  const [payme, setPayme] = useState(String(paymePct));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = Number(click) !== clickPct || Number(payme) !== paymePct;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clickPct: Number(click.replace(",", ".")), paymePct: Number(payme.replace(",", ".")) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Saqlab bölmadi");
      setMsg({ ok: true, text: "Saqlandi — hisob yangilandi" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, v: string, set: (s: string) => void) => (
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
      {label}
      <span className="flex items-center gap-1.5">
        <input
          value={v}
          onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ""))}
          inputMode="decimal"
          className="input w-24 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
        />
        <span className="text-sm" style={{ color: "var(--viz-text)" }}>
          %
        </span>
      </span>
    </label>
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      {field("Click olib qoladi", click, setClick)}
      {field("Payme olib qoladi", payme, setPayme)}
      <button
        type="button"
        onClick={save}
        disabled={busy || !changed}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-40"
      >
        {busy ? "Saqlanmoqda…" : "Saqlaş"}
      </button>
      {msg && <span className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</span>}
    </div>
  );
}
