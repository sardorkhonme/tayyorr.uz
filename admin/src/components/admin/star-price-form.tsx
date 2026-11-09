"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** 1 star narxi (so'm) — admin belgilaydi. */
export function StarPriceForm({ value }: { value: number }) {
  const router = useRouter();
  const [v, setV] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = Number(v);
  const valid = Number.isInteger(n) && n >= 100 && n <= 1_000_000;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/star-price", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: n }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Saqlab bölmadi");
      setMsg({ ok: true, text: "Saqlandi — yangi xaridlarga darhol taʼsir qiladi" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">1 ⭐ narxi</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Tayyorlovçi hamyonidan star sotib olganda 1 star uçun neça söm yeçiladi. Hamyon sahifasi va qöllanmada şu narx körinadi.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          value={v}
          onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 7))}
          inputMode="numeric"
          className="input rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
          style={{ width: "7rem" }}
        />
        söm
      </label>
      <button
        type="button"
        onClick={save}
        disabled={busy || !valid || n === value}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-40"
      >
        {busy ? "Saqlanmoqda…" : "Saqlaş"}
      </button>
      {msg && <span className={`w-full text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</span>}
    </section>
  );
}
