"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Service = { id: string; name: string; platform: string };
type Active = { id: string; label: string; until: string; reason: string | null; permanent: boolean };

const GROUPS: { title: string; items: { scope: string; label: string; hint?: string }[] }[] = [
  { title: "Tayyorr SMM", items: [{ scope: "smm", label: "Tayyorr SMM — butunlay", hint: "Heç qanday SMM buyurtma bera olmaydi" }] },
  {
    title: "Tayyorr.uz",
    items: [
      { scope: "uz_orders", label: "Buyurtma beriş" },
      { scope: "uz_offers", label: "Taklif yuboriş" },
      { scope: "uz_chat", label: "Şaxsiy xabar yoziş", hint: "Support bilan yozişa oladi" },
      { scope: "payout", label: "Pul yeçib oliş" },
    ],
  },
  { title: "Tayyorr’s Family", items: [{ scope: "family", label: "Guruhga yoziş", hint: "Öqiy oladi, lekin yoza olmaydi" }] },
];

function defaultUntil(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Qisman cheklov: faqat tanlangan imkoniyatlar yopiladi (hisobning qolgan qismi ishlaydi). */
export function PartialRestrictionForm({ userId, services, active }: { userId: string; services: Service[]; active: Active[] }) {
  const router = useRouter();
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [until, setUntil] = useState(defaultUntil());
  const [indefinite, setIndefinite] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? services.filter((x) => `${x.name} ${x.platform}`.toLowerCase().includes(s)) : services;
    return list.slice(0, 60);
  }, [services, q]);

  const toggle = (set: Set<string>, v: string, fn: (s: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/restrictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopes: [...scopes],
          serviceIds: [...picked],
          until: indefinite ? undefined : new Date(until).toISOString(),
          indefinite,
          reason,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Xatolik");
      setScopes(new Set());
      setPicked(new Set());
      setReason("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(null);
    }
  }

  async function remove(rid: string) {
    setBusy(rid);
    try {
      await fetch(`/api/admin/users/${userId}/restrictions?rid=${encodeURIComponent(rid)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-zinc-500">Amaldagi qisman çeklovlar:</p>
          {active.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-sm">
              <span className="font-medium text-amber-200">{a.label}</span>
              <span className="text-xs text-zinc-400">{a.permanent ? "muddatsiz" : `${a.until} gaça`}</span>
              {a.reason && <span className="text-xs text-zinc-500">· {a.reason}</span>}
              <button
                type="button"
                className="ml-auto rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                disabled={busy !== null}
                onClick={() => remove(a.id)}
              >
                {busy === a.id ? "..." : "Olib taşlaş"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{g.title}</p>
            <div className="flex flex-col gap-1.5">
              {g.items.map((it) => (
                <label key={it.scope} className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 text-sm hover:bg-white/[0.05]">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-violet-500"
                    checked={scopes.has(it.scope)}
                    onChange={() => toggle(scopes, it.scope, setScopes)}
                  />
                  <span>
                    <span className="text-white">{it.label}</span>
                    {it.hint && <span className="block text-xs text-zinc-500">{it.hint}</span>}
                  </span>
                </label>
              ))}
              {g.title === "Tayyorr SMM" && !scopes.has("smm") && (
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="mb-2 text-sm text-white">
                    Faqat maʼlum xizmat(lar)
                    {picked.size > 0 && <span className="ml-2 text-xs text-violet-300">tanlangan: {picked.size}</span>}
                  </p>
                  <input className="input !py-1.5 text-sm" placeholder="Xizmat qidiriş (nomi yoki platforma)" value={q} onChange={(e) => setQ(e.target.value)} />
                  <div className="mt-2 max-h-56 overflow-y-auto">
                    {shown.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                        <input type="checkbox" className="h-4 w-4 accent-violet-500" checked={picked.has(s.id)} onChange={() => toggle(picked, s.id, setPicked)} />
                        <span className="min-w-0 flex-1 truncate text-zinc-200">{s.name}</span>
                        <span className="text-xs text-zinc-500">{s.platform}</span>
                      </label>
                    ))}
                    {shown.length === 0 && <p className="py-3 text-center text-xs text-zinc-500">Topilmadi</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Muddat (sana va soat)</label>
            <input className="input" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} disabled={indefinite} required={!indefinite} />
            <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={indefinite} onChange={(e) => setIndefinite(e.target.checked)} />
              Muddatsiz
            </label>
          </div>
          <div>
            <label className="label">Sabab (foydalanuvçiga körinadi)</label>
            <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="btn-primary w-fit" disabled={busy !== null || (scopes.size === 0 && picked.size === 0)}>
          {busy === "add" ? "..." : "Tanlanganlarni çeklaş"}
        </button>
      </form>
    </div>
  );
}
