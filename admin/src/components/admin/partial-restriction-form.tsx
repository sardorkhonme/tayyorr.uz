"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { KIND_RULES, PLATFORM_NAME } from "@/lib/smm-adjust";

type Service = { id: string; name: string; platform: string; kind: string };
type Active = { id: string; label: string; until: string; reason: string | null; permanent: boolean };

const GROUPS: { title: string; items: { scope: string; label: string; hint?: string }[] }[] = [
  { title: "Tayyorr SMM", items: [{ scope: "smm", label: "Tayyorr SMM — butunlay", hint: "Heç qanday SMM buyurtma bera olmaydi" }] },
  {
    title: "Tayyorr.uz",
    items: [
      { scope: "uz_all", label: "Tayyorr.uz — butunlay", hint: "Buyurtma, taklif va şaxsiy xabarlar yopiladi (Support bilan yozişa oladi)" },
      { scope: "uz_orders", label: "Buyurtma beriş" },
      { scope: "uz_offers", label: "Taklif yuboriş" },
      { scope: "uz_chat", label: "Şaxsiy xabar yoziş", hint: "Support bilan yozişa oladi" },
    ],
  },
  {
    title: "Hamyon (tayyorr+)",
    items: [
      { scope: "topup", label: "Hisobni töldiriş", hint: "tayyorr+, Tayyorr SMM, Tayyorr.uz va ilovada" },
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
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? services.filter((x) => `${x.name} ${x.platform}`.toLowerCase().includes(s)) : [];
    return list.slice(0, 60);
  }, [services, q]);

  // platforma → tur → xizmatlar
  const tree = useMemo(() => {
    const byP = new Map<string, Map<string, Service[]>>();
    for (const x of services) {
      const kinds = byP.get(x.platform) ?? new Map<string, Service[]>();
      kinds.set(x.kind, [...(kinds.get(x.kind) ?? []), x]);
      byP.set(x.platform, kinds);
    }
    const pOrder = Object.keys(PLATFORM_NAME);
    const kOrder = KIND_RULES.map((k) => k.key);
    const idx = (arr: string[], v: string) => (arr.indexOf(v) < 0 ? 99 : arr.indexOf(v));
    return [...byP.entries()]
      .sort((a, b) => idx(pOrder, a[0]) - idx(pOrder, b[0]))
      .map(([platform, kinds]) => ({
        platform,
        count: [...kinds.values()].reduce((n, l) => n + l.length, 0),
        kinds: [...kinds.entries()].sort((a, b) => idx(kOrder, a[0]) - idx(kOrder, b[0])).map(([kind, list]) => ({ kind, list })),
      }));
  }, [services]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const pName = (p: string) => PLATFORM_NAME[p] ?? p;
  const kName = (k: string) => KIND_RULES.find((r) => r.key === k)?.label ?? k;
  // yuqori daraja belgilangan bo'lsa — ichidagilar ham yopiladi (alohida yuborilmaydi)
  const coveredBy = (x: Service) =>
    picked.has(`p:${x.platform}`) ? "p" : picked.has(`g:${x.platform}:${x.kind}`) ? "g" : null;
  const effective = () =>
    [...picked].filter((t) => {
      if (t.startsWith("p:")) return true;
      if (t.startsWith("g:")) return !picked.has(`p:${t.split(":")[1]}`);
      const x = services.find((v) => v.id === t);
      return !x || !coveredBy(x);
    });

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
          scopes: scopes.has("uz_all") ? [...scopes].filter((s) => !["uz_orders", "uz_offers", "uz_chat"].includes(s)) : [...scopes],
          notify,
          serviceIds: effective(),
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
              {g.items.filter((it) => !(scopes.has("uz_all") && ["uz_orders", "uz_offers", "uz_chat"].includes(it.scope))).map((it) => (
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
                    Faqat maʼlum platforma, tur yoki xizmat(lar)
                    {picked.size > 0 && <span className="ml-2 text-xs text-violet-300">tanlangan: {effective().length}</span>}
                  </p>
                  <p className="mb-2 text-xs text-zinc-500">
                    Butun platformani (masalan Instagram), uning bir turini (masalan Instagram → layklar) yoki alohida xizmatni belgilang.
                  </p>
                  <input className="input !py-1.5 text-sm" placeholder="Xizmat qidiriş (nomi yoki platforma)" value={q} onChange={(e) => setQ(e.target.value)} />
                  <div className="mt-2 max-h-80 overflow-y-auto">
                    {q.trim() ? (
                      <>
                        {shown.map((s) => {
                          const cov = coveredBy(s);
                          return (
                            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                              <input type="checkbox" className="h-4 w-4 accent-violet-500" disabled={!!cov} checked={!!cov || picked.has(s.id)} onChange={() => toggle(picked, s.id, setPicked)} />
                              <span className="min-w-0 flex-1 truncate text-zinc-200">{s.name}</span>
                              <span className="text-xs text-zinc-500">{pName(s.platform)} · {kName(s.kind)}</span>
                            </label>
                          );
                        })}
                        {shown.length === 0 && <p className="py-3 text-center text-xs text-zinc-500">Topilmadi</p>}
                      </>
                    ) : (
                      tree.map((p) => {
                        const pKey = `p:${p.platform}`;
                        const pOn = picked.has(pKey);
                        return (
                          <div key={p.platform} className="border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-2 px-1 py-1.5">
                              <button type="button" className="w-5 text-zinc-500 hover:text-white" onClick={() => toggle(open, pKey, setOpen)}>
                                {open.has(pKey) ? "▾" : "▸"}
                              </button>
                              <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                                <input type="checkbox" className="h-4 w-4 accent-violet-500" checked={pOn} onChange={() => toggle(picked, pKey, setPicked)} />
                                <span className="font-medium text-white">{pName(p.platform)}</span>
                                <span className="text-xs text-zinc-500">— butunlay · {p.count} ta xizmat</span>
                              </label>
                            </div>
                            {open.has(pKey) &&
                              p.kinds.map((k) => {
                                const gKey = `g:${p.platform}:${k.kind}`;
                                const gOn = pOn || picked.has(gKey);
                                return (
                                  <div key={gKey} className="ml-6">
                                    <div className="flex items-center gap-2 px-1 py-1">
                                      <button type="button" className="w-5 text-zinc-500 hover:text-white" onClick={() => toggle(open, gKey, setOpen)}>
                                        {open.has(gKey) ? "▾" : "▸"}
                                      </button>
                                      <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                                        <input type="checkbox" className="h-4 w-4 accent-violet-500" disabled={pOn} checked={gOn} onChange={() => toggle(picked, gKey, setPicked)} />
                                        <span className="text-zinc-200">{kName(k.kind)}</span>
                                        <span className="text-xs text-zinc-500">{k.list.length} ta</span>
                                      </label>
                                    </div>
                                    {open.has(gKey) &&
                                      k.list.map((s) => (
                                        <label key={s.id} className="ml-7 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-white/5">
                                          <input type="checkbox" className="h-4 w-4 accent-violet-500" disabled={gOn} checked={gOn || picked.has(s.id)} onChange={() => toggle(picked, s.id, setPicked)} />
                                          <span className="min-w-0 flex-1 truncate text-zinc-300">{s.name}</span>
                                        </label>
                                      ))}
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })
                    )}
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
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Foydalanuvçiga xabar yuboriş (har tizim uçun alohida: qaysi tizimda, nima çeklangani, muddat va sabab)
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="btn-primary w-fit" disabled={busy !== null || (scopes.size === 0 && picked.size === 0)}>
          {busy === "add" ? "..." : "Tanlanganlarni çeklaş"}
        </button>
      </form>
    </div>
  );
}
