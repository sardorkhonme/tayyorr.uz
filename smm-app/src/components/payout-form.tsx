"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { num, som } from "@/lib/format";
import { useFlashState } from "@/components/flash-status";
import { appConfirm, appAlert } from "@/components/app-dialog";

const COMMISSION = 5; // src/lib/payout.ts bilan bir xil
const MIN = 1_000;

/** Kartaga yechib olish — 5% komissiya haqida ogohlantirish bilan. */
export function PayoutForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [card, setCard] = useState("");
  const [cardName, setCardName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useFlashState<{ ok: boolean; text: string } | null>(null);

  const digits = card.replace(/\D/g, "").slice(0, 16);
  const value = Number(amount) || 0;
  const commission = Math.ceil((value * COMMISSION) / 100);
  const net = value - commission;
  const valid = digits.length === 16 && value >= MIN && value <= balance;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/wallet/payout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: value, card: digits, cardName: cardName.trim() || undefined }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg({ ok: false, text: data?.error ?? "Xatolik, qayta urinib köring" });
    setMsg({ ok: true, text: "Sörov yuborildi — admin tez orada kartangizga ötkazadi" });
    setCard("");
    setCardName("");
    setAmount("");
    router.refresh();
  }

  return (
    <form id="payout" onSubmit={submit} className="card scroll-mt-24 space-y-5 !rounded-3xl p-6 sm:p-7">
      <div>
        <h2 className="font-display text-xl font-bold text-zinc-900">Kartaga yeçib oliş</h2>
        <p className="mt-1 text-sm text-zinc-500">Hamyondagi pulni bank kartangizga ötkazamiz.</p>
      </div>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p>
          <span className="font-semibold">Diqqat: kartaga yeçişda {COMMISSION}% komissiya olinadi.</span> Masalan,
          100 000 söm yeçsangiz, kartangizga 95 000 söm tuşadi.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="card">Karta raqami</label>
        <input
          id="card"
          className="input font-mono tracking-wider"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="8600 0000 0000 0000"
          value={digits.replace(/(\d{4})(?=\d)/g, "$1 ")}
          onChange={(e) => setCard(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="cardName">
          Karta egasi <span className="font-normal text-zinc-400">(ixtiyoriy)</span>
        </label>
        <input
          id="cardName"
          className="input"
          autoComplete="cc-name"
          placeholder="ISM FAMILIYA"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          maxLength={100}
        />
      </div>
      <div>
        <label className="label" htmlFor="amount">
          Summa <span className="font-normal text-zinc-400">(hamyonda: {som(balance)})</span>
        </label>
        <input
          id="amount"
          className="input font-display !text-lg font-semibold"
          inputMode="numeric"
          placeholder={`kamida ${num(MIN)}`}
          value={amount ? num(value) : ""}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          required
        />
        {value > balance && <p className="mt-1.5 text-sm text-red-600">Hamyonda yetarli mablağ yöq</p>}
      </div>

      {value >= MIN && (
        <div className="rounded-2xl bg-zinc-50 p-4 text-[15px]">
          <div className="flex justify-between text-zinc-500">
            <span>Hamyondan yeçiladi</span>
            <span>{som(value)}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-zinc-500">
            <span>Komissiya ({COMMISSION}%)</span>
            <span>−{som(commission)}</span>
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-zinc-200 pt-3">
            <span className="font-medium text-zinc-700">Kartangizga tuşadi</span>
            <span className="font-display text-2xl font-bold text-emerald-600">{som(net)}</span>
          </div>
        </div>
      )}

      {msg && (
        <p className={`flash-status rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      <button className="btn-primary w-full !py-4 !text-base" disabled={!valid || busy}>
        {busy ? "Yuborilmoqda…" : "Yeçib oliş"}
      </button>
    </form>
  );
}

export function PayoutCancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (
          !(await appConfirm({
            title: "Sörovni bekor qilasizmi?",
            message: "Pul hamyonga qaytadi.",
            confirmText: "Ha, bekor qiliş",
            cancelText: "Yöq",
            danger: true,
          }))
        )
          return;
        setBusy(true);
        const res = await fetch(`/api/wallet/payout/${id}/cancel`, { method: "POST" }).catch(() => null);
        setBusy(false);
        if (!res?.ok) {
          const d = await res?.json().catch(() => null);
          await appAlert({ title: "Xatolik", message: d?.error ?? "Bekor qilib bölmadi" });
        }
        router.refresh();
      }}
      className="shrink-0 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      {busy ? "…" : "Bekor qiliş"}
    </button>
  );
}
