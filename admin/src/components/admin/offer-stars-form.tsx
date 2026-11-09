"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Buyurtmaga ariza ("men qilaman") uchun minimal star — admin belgilaydi. */
export function OfferStarsForm({ value }: { value: number }) {
  const router = useRouter();
  const [v, setV] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = Number(v);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/offer-stars", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: n }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Saqlab bölmadi");
      setMsg({ ok: true, text: "Saqlandi — yangi arizalarga darhol taʼsir qiladi" });
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
        <p className="font-semibold text-white">Ariza uçun minimal star</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Tayyorlovçi buyurtmaga «men qilaman» deb ariza yuboriși uçun kamida neça ⭐ sarflaşi kerak. Köproq star — navbatda yuqoriroq örin.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          value={v}
          onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          className="input w-20 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
          style={{ width: "5rem" }}
        />
        ⭐
      </label>
      <button
        type="button"
        onClick={save}
        disabled={busy || !(n >= 1 && n <= 1000) || n === value}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-40"
      >
        {busy ? "Saqlanmoqda…" : "Saqlaş"}
      </button>
      {msg && <span className={`w-full text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</span>}
    </section>
  );
}
