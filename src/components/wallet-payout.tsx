"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { PAYOUT_COMMISSION_PERCENT, payoutNet } from "@/lib/payout-commission";

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

export function WalletPayout({ balance }: { balance: number }) {
  const router = useRouter();
  const [card, setCard] = useState("");
  const [cardName, setCardName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const value = Number(amount) || 0;
  const { commission, net } = payoutNet(value);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          card,
          cardName: cardName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Amalga oshmadi");
      setMsg({
        ok: true,
        text: "Mablag' hisobdan yechildi va tez orada kartangizga o'tkaziladi.",
      });
      setCard("");
      setCardName("");
      setAmount("");
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3">
      <h2 className="font-semibold text-white">Kartaga yechib olish</h2>
      <p className="-mt-1 text-xs text-zinc-500">
        Mablag' darhol hisobdan yechiladi va kartangizga o'tkaziladi.
        Mavjud: {balance.toLocaleString("ru-RU")} so'm.
      </p>
      <div className="flex gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p>
          <span className="font-semibold">Diqqat: kartaga yechishda {PAYOUT_COMMISSION_PERCENT}% komissiya olinadi.</span>{" "}
          Masalan, 100 000 so&apos;m yechsangiz, kartangizga 95 000 so&apos;m tushadi.
        </p>
      </div>
      <div>
        <label className="label">Karta raqami</label>
        <input
          className="input font-mono tracking-widest"
          inputMode="numeric"
          placeholder="8600 0000 0000 0000"
          value={card}
          onChange={(e) => setCard(formatCard(e.target.value))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Karta egasi (ixtiyoriy)</label>
          <input
            className="input"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Summa (so'm)</label>
          <input
            className="input"
            type="number"
            min={1000}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>
      {value >= 1000 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Hamyondan yechiladi</span>
            <span>{value.toLocaleString("ru-RU")} so&apos;m</span>
          </div>
          <div className="mt-1 flex justify-between text-zinc-400">
            <span>Komissiya ({PAYOUT_COMMISSION_PERCENT}%)</span>
            <span>−{commission.toLocaleString("ru-RU")} so&apos;m</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
            <span>Kartangizga tushadi</span>
            <span className="text-emerald-400">{net.toLocaleString("ru-RU")} so&apos;m</span>
          </div>
        </div>
      )}
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}
      <button className="btn-primary w-fit" disabled={busy}>
        {busy ? "..." : "Yechib olish"}
      </button>
    </form>
  );
}
