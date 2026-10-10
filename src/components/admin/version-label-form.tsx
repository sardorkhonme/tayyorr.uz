"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Akkaunt bo'limi ostidagi versiya yorlig'ini o'zgartirish (bo'sh — avtomatik). */
export function VersionLabelForm({ initial, fallback }: { initial: string; fallback: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setMsg({ ok: true, text: "Saqlandi" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="font-semibold text-white">Versiya yorlig&apos;i</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sayt va ilovadagi Akkaunt bo&apos;limi ostida ko&apos;rinadi. Bo&apos;sh qoldirsangiz —
          avtomatik: saytda <span className="font-mono text-zinc-300">{fallback}</span>, ilovada esa
          o&apos;rnatilgan versiyasining raqami.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          className="input max-w-xs font-mono"
          placeholder={fallback}
          maxLength={30}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? "..." : "Saqlash"}
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
