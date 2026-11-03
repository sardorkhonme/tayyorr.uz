"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

export function BalanceAdjustForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<"SOM" | "STAR">("SOM");
  const [direction, setDirection] = useState<"ADD" | "SUBTRACT">("ADD");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}/adjust-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          currency,
          amount: Number(amount),
          reason,
          notify,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setAmount("");
      setReason("");
      setOk(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCurrency("SOM")}
          className={`backdrop-blur-sm flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
            currency === "SOM"
              ? "bg-indigo-500/20 text-indigo-300"
              : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          <Icon name="coins" className="h-4 w-4" />
          Söm
        </button>
        <button
          type="button"
          onClick={() => setCurrency("STAR")}
          className={`backdrop-blur-sm flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
            currency === "STAR"
              ? "bg-amber-500/20 text-amber-300"
              : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          <Icon name="star" className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />
          Star
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDirection("ADD")}
          className={`backdrop-blur-sm flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
            direction === "ADD"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          + Qöşiş
        </button>
        <button
          type="button"
          onClick={() => setDirection("SUBTRACT")}
          className={`backdrop-blur-sm flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
            direction === "SUBTRACT"
              ? "bg-red-500/20 text-red-300"
              : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          − Ayiriş
        </button>
      </div>
      <div>
        <label className="label">
          Summa ({currency === "STAR" ? "star" : "söm"})
        </label>
        <input
          className="input"
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Sabab (foydalanuvçiga körinadi)</label>
        <textarea
          className="input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
        «tayyorr.uz support» orqali xabar yuborilsin
      </label>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {ok && <p className="text-sm text-emerald-400">Balans yangilandi.</p>}
      <button
        className={direction === "ADD" ? "btn-primary w-fit" : "w-fit rounded-xl bg-red-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"}
        disabled={busy || !amount || !reason.trim()}
      >
        {busy ? "..." : direction === "ADD" ? "Qöşiş" : "Ayiriş"}
      </button>
    </form>
  );
}
