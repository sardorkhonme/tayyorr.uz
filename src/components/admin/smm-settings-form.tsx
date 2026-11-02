"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** TayyorrSMM: ustama (%) va dollar kursini yangilash. */
export function SmmSettingsForm({
  markupPercent,
  markupIsDefault,
  fx,
}: {
  markupPercent: number;
  markupIsDefault: boolean;
  fx: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(markupPercent));
  const [busy, setBusy] = useState<"save" | "rate" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pct = Number(value);
  const example = fx && Number.isFinite(pct) ? Math.ceil((1 * fx * (1 + pct / 100)) / 100) * 100 : null;

  async function call(kind: "save" | "rate") {
    setBusy(kind);
    setMsg(null);
    try {
      const res = await fetch(kind === "save" ? "/api/admin/smm-settings" : "/api/admin/smm-settings/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: kind === "save" ? JSON.stringify({ markupPercent: pct }) : "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setMsg({ ok: true, text: kind === "save" ? "Saqlandi — narxlar 1 daqiqa ichida yangilanadi" : "Kurs yangilandi" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Xatolik" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        call("save");
      }}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div>
        <h2 className="font-semibold text-white">Ustama (foyda)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sotuv narxi = provayder narxi (USD) × dollar kursi × (1 + ustama%).
          {markupIsDefault && " Hozir standart qiymat ishlatilmoqda."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            className="input w-32 pr-8 font-mono"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
        </div>
        <button className="btn-primary" disabled={busy !== null || !Number.isFinite(pct)}>
          {busy === "save" ? "..." : "Saqlash"}
        </button>
        <button type="button" className="btn-ghost" disabled={busy !== null} onClick={() => call("rate")}>
          {busy === "rate" ? "..." : "Kursni hozir yangilash"}
        </button>
      </div>
      {example != null && (
        <p className="text-sm text-zinc-400">
          Misol: provayderda 1000 dona <span className="text-white">$1.00</span> bo&apos;lsa — saytda{" "}
          <span className="font-semibold text-white">{example.toLocaleString("ru-RU")} so&apos;m</span>
        </p>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
