"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";

type Method = "crypto" | "card" | "other";
const METHODS: Record<Method, string> = { crypto: "Kripto (USDT)", card: "Karta", other: "Boşqa" };

const num = (s: string) => Number(s.replace(",", "."));
const nf = new Intl.NumberFormat("ru-RU");
const inputCls =
  "input rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60";

function PctField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
      {label}
      <span className="flex items-center gap-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" className={inputCls} style={{ width: "5.5rem" }} />
        <span className="text-sm" style={{ color: "var(--viz-text)" }}>
          %
        </span>
      </span>
    </label>
  );
}

/** To'lov tizimlari va provayderga pul tashlash usullari foizi — o'zgartirilsa Moliya qayta hisoblanadi. */
export function FinanceSettingsForm({ clickPct, paymePct, deposit }: { clickPct: number; paymePct: number; deposit: Record<Method, number> }) {
  const router = useRouter();
  const [v, setV] = useState({
    click: String(clickPct),
    payme: String(paymePct),
    crypto: String(deposit.crypto),
    card: String(deposit.card),
    other: String(deposit.other),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed =
    num(v.click) !== clickPct || num(v.payme) !== paymePct || num(v.crypto) !== deposit.crypto || num(v.card) !== deposit.card || num(v.other) !== deposit.other;
  const set = (k: keyof typeof v) => (s: string) => setV((x) => ({ ...x, [k]: s }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clickPct: num(v.click),
          paymePct: num(v.payme),
          deposit: { crypto: num(v.crypto), card: num(v.card), other: num(v.other) },
        }),
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--viz-muted)" }}>
          Saytga tölov qabul qiliş
        </p>
        <div className="flex flex-wrap gap-3">
          <PctField label="Click olib qoladi" value={v.click} onChange={set("click")} />
          <PctField label="Payme olib qoladi" value={v.payme} onChange={set("payme")} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--viz-muted)" }}>
          Provayderga pul taşlaş (odatiy foiz)
        </p>
        <div className="flex flex-wrap gap-3">
          <PctField label={METHODS.crypto} value={v.crypto} onChange={set("crypto")} />
          <PctField label={METHODS.card} value={v.card} onChange={set("card")} />
          <PctField label={METHODS.other} value={v.other} onChange={set("other")} />
        </div>
      </div>
      <div className="flex items-center gap-3">
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
    </div>
  );
}

type Deposit = { id: string; date: string; method: Method; paid: number; feePct: number; note?: string };

/** Provayderga (smmcloud) pul tashlashlar: yangisini qo'shish va ro'yxat (xato bo'lsa — o'chirish). */
export function ProviderDeposits({ deposits, defaults, today }: { deposits: Deposit[]; defaults: Record<Method, number>; today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Method>("crypto");
  const [paid, setPaid] = useState("");
  const [fee, setFee] = useState(String(defaults.crypto));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const paidN = Number(paid.replace(/\s/g, ""));
  const feeN = num(fee);
  const feeSom = paidN > 0 && feeN >= 0 ? Math.round((paidN * feeN) / 100) : 0;

  async function call(init: RequestInit, url = "/api/admin/finance/deposits") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, init);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Xatolik");
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Xatolik" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, method, paid: paidN, feePct: feeN, note: note || undefined }),
    });
    if (ok) {
      setPaid("");
      setNote("");
      setMsg({ ok: true, text: "Qöşildi" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Sana
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputCls} style={{ colorScheme: "inherit" }} />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Usul
          <select
            value={method}
            onChange={(e) => {
              const m = e.target.value as Method;
              setMethod(m);
              setFee(String(defaults[m]));
            }}
            className={`${inputCls} bg-[#14141b]`}
          >
            {(Object.keys(METHODS) as Method[]).map((m) => (
              <option key={m} value={m}>
                {METHODS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Siz töladingiz (söm)
          <input
            value={paid}
            onChange={(e) => setPaid(e.target.value.replace(/[^\d]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " "))}
            inputMode="numeric"
            placeholder="1 200 000"
            className={`${inputCls} w-36`}
          />
        </label>
        <PctField label="Olib qolindi" value={fee} onChange={setFee} />
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Izoh (ixtiyoriy)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="masalan: Binance → smmcloud" className={inputCls} />
        </label>
        <button
          disabled={busy || !(paidN > 0)}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-40"
        >
          Qöşiş
        </button>
      </form>
      {paidN > 0 && (
        <p className="-mt-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Yölda olib qolinadi: <b style={{ color: "var(--viz-bad)" }}>{nf.format(feeSom)} söm</b> · provayderga yetib boradi:{" "}
          <b style={{ color: "var(--viz-text)" }}>{nf.format(paidN - feeSom)} söm</b>
        </p>
      )}
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}

      {deposits.length === 0 ? (
        <p className="rounded-lg px-3 py-3 text-sm" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
          Hali yozuv yöq. smmcloud ga har pul taşlaganingizda şu yerga kiriting — hisob aniq böladi.
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--viz-grid)" }}>
          {deposits.map((d) => {
            const f = Math.round((d.paid * d.feePct) / 100);
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm" style={{ borderColor: "var(--viz-grid)" }}>
                <span className="w-24 shrink-0 tabular-nums" style={{ color: "var(--viz-muted)" }}>
                  {d.date.split("-").reverse().join(".")}
                </span>
                <span className="w-28 shrink-0" style={{ color: "var(--viz-text)" }}>
                  {METHODS[d.method] ?? d.method}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tabular-nums" style={{ color: "var(--viz-text)" }}>
                    {nf.format(d.paid)} söm
                  </span>
                  <span className="text-xs" style={{ color: "var(--viz-muted)" }}>
                    {" "}
                    · {d.feePct}% = <span style={{ color: "var(--viz-bad)" }}>−{nf.format(f)} söm</span>
                    {d.note && ` · ${d.note}`}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm("Şu yozuv öçirilsinmi?") && call({ method: "DELETE" }, `/api/admin/finance/deposits?id=${d.id}`)}
                  aria-label="Öçiriş"
                  className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Withdrawal = { id: string; date: string; amount: number; note?: string };

/** Bank hisobidan o'zingiz uchun yechib olgan pul: qo'shish va ro'yxat. */
export function OwnerWithdrawals({ items, today, available }: { items: Withdrawal[]; today: string; available: number }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = Number(amount.replace(/\s/g, ""));

  async function call(init: RequestInit, url = "/api/admin/finance/withdrawals") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, init);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Xatolik");
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Xatolik" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (n > available && !confirm(`Bu summa sizniki deb hisoblangan puldan (${nf.format(Math.max(available, 0))} söm) köp. Baribir yozilsinmi?`)) return;
    const ok = await call({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, amount: n, note: note || undefined }) });
    if (ok) {
      setAmount("");
      setNote("");
      setMsg({ ok: true, text: "Yozildi" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Sana
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputCls} style={{ colorScheme: "inherit" }} />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Yeçib oldingiz (söm)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " "))}
            inputMode="numeric"
            placeholder="500 000"
            className={`${inputCls} w-36`}
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          Izoh (ixtiyoriy)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="masalan: oylik, reklama uçun" className={inputCls} />
        </label>
        <button disabled={busy || !(n > 0)} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-40">
          Yozib qöyiş
        </button>
      </form>
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
      {items.length === 0 ? (
        <p className="rounded-lg px-3 py-3 text-sm" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
          Hali pul yeçilmagan.
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--viz-grid)" }}>
          {items.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm" style={{ borderColor: "var(--viz-grid)" }}>
              <span className="w-24 shrink-0 tabular-nums" style={{ color: "var(--viz-muted)" }}>
                {w.date.split("-").reverse().join(".")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="tabular-nums" style={{ color: "var(--viz-text)" }}>
                  {nf.format(w.amount)} söm
                </span>
                {w.note && (
                  <span className="text-xs" style={{ color: "var(--viz-muted)" }}>
                    {" "}
                    · {w.note}
                  </span>
                )}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm("Şu yozuv öçirilsinmi?") && call({ method: "DELETE" }, `/api/admin/finance/withdrawals?id=${w.id}`)}
                aria-label="Öçiriş"
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
