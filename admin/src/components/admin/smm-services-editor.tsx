"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icons";
import {
  ADJUST_MAX,
  ADJUST_MIN,
  KIND_RULES,
  adjustPct,
  groupKey,
  kindKey,
  parseAdjust,
  type Adjust,
} from "@/lib/smm-adjust";
import { useFlashState } from "@/components/flash-status";

type Service = {
  providerId: number;
  platform: string;
  category: string;
  name: string;
  providerRate: number;
  min: number;
  max: number;
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  other: "Boşqa",
};
const PLATFORM_ORDER = Object.keys(PLATFORM_NAMES);
const QUICK = [-20, -10, 0, 10, 20];

const som = (n: number) => n.toLocaleString("ru-RU");

/** "−10" / "+15" kabi kiritishni songa aylantiradi; bo'sh — null. */
function parsePct(raw: string): number | null {
  const t = raw.replace(",", ".").replace("−", "-").trim();
  if (t === "" || t === "-" || t === "+") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.min(ADJUST_MAX, Math.max(ADJUST_MIN, Math.round(n * 10) / 10));
}

function PctBadge({ pct }: { pct: number }) {
  if (!pct) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        pct < 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
      }`}
    >
      {pct > 0 ? "+" : "−"}
      {Math.abs(pct)}% {pct < 0 ? "çegirma" : "ustama"}
    </span>
  );
}

function PctInput({
  value,
  placeholder,
  onChange,
}: {
  value: number | undefined;
  placeholder?: string;
  onChange: (v: number | null) => void;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  return (
    <div className="relative">
      <input
        className="input w-24 pr-7 text-right font-mono"
        inputMode="decimal"
        value={text}
        placeholder={placeholder ?? "0"}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,+\-−]/g, "");
          setText(t);
          onChange(parsePct(t));
        }}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
    </div>
  );
}

export function SmmServicesEditor({
  services,
  fx,
  markupPercent,
  initial,
}: {
  services: Service[];
  fx: number;
  markupPercent: number;
  initial: Adjust;
}) {
  const router = useRouter();
  const [adjust, setAdjust] = useState<Adjust>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [platform, setPlatform] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useFlashState<{ ok: boolean; text: string } | null>(null);
  // guruh inputlarini tashqaridan (tez tugmalar) yangilash uchun
  const [inputKey, setInputKey] = useState(0);

  const dirty = JSON.stringify(adjust) !== saved;

  const base = (s: Service) => s.providerRate * fx * (1 + markupPercent / 100);
  const priceOf = (s: Service, adj: Adjust) =>
    Math.max(100, Math.ceil((base(s) * (1 + adjustPct(adj, s) / 100)) / 100) * 100);
  const basePrice = (s: Service) => Math.max(100, Math.ceil(base(s) / 100) * 100);

  // platforma → tur → xizmatlar
  const tree = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Map<string, Service[]>>();
    for (const s of services) {
      if (platform !== "all" && s.platform !== platform) continue;
      if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q) && String(s.providerId) !== q)
        continue;
      const kind = kindKey(s.category, s.name);
      if (!map.has(s.platform)) map.set(s.platform, new Map());
      const kinds = map.get(s.platform)!;
      if (!kinds.has(kind)) kinds.set(kind, []);
      kinds.get(kind)!.push(s);
    }
    return [...map.entries()]
      .sort((a, b) => PLATFORM_ORDER.indexOf(a[0]) - PLATFORM_ORDER.indexOf(b[0]))
      .map(([p, kinds]) => ({
        platform: p,
        kinds: KIND_RULES.filter((k) => kinds.has(k.key)).map((k) => ({ ...k, services: kinds.get(k.key)! })),
      }));
  }, [services, platform, query]);

  const platformsPresent = useMemo(
    () => PLATFORM_ORDER.filter((p) => services.some((s) => s.platform === p)),
    [services],
  );

  function setGroup(key: string, pct: number | null) {
    setAdjust((a) => {
      const groups = { ...a.groups };
      if (pct === null || pct === 0) delete groups[key];
      else groups[key] = pct;
      return { ...a, groups };
    });
  }

  function setService(id: number, patch: { pct?: number | null; off?: boolean }) {
    setAdjust((a) => {
      const services = { ...a.services };
      const cur = { ...(services[String(id)] ?? {}) };
      if ("pct" in patch) {
        if (patch.pct === null || patch.pct === undefined) delete cur.pct;
        else cur.pct = patch.pct;
      }
      if ("off" in patch) {
        if (patch.off) cur.off = true;
        else delete cur.off;
      }
      if (cur.pct === undefined && !cur.off) delete services[String(id)];
      else services[String(id)] = cur;
      return { ...a, services };
    });
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/smm-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjust),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      const clean = parseAdjust(data.adjust);
      setAdjust(clean);
      setSaved(JSON.stringify(clean));
      setMsg({ ok: true, text: "Saqlandi — saytda 1 daqiqa içida yangilanadi" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  const hiddenCount = Object.values(adjust.services).filter((s) => s.off).length;

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* filtrlar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {["all", ...platformsPresent].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                platform === p ? "bg-white text-zinc-900" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p === "all" ? "Hammasi" : PLATFORM_NAMES[p] ?? p}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            className="input w-full pl-9"
            placeholder="Xizmat nomi yoki ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Jami {services.length} ta faol xizmat
        {hiddenCount > 0 && <> · <span className="text-red-300">{hiddenCount} tasi saytda yaşirilgan</span></>}
      </p>

      {tree.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-zinc-500">
          Heç narsa topilmadi.
        </p>
      )}

      {tree.map(({ platform: p, kinds }) => (
        <section key={p} className="flex flex-col gap-3">
          <h2 className="font-semibold text-white">{PLATFORM_NAMES[p] ?? p}</h2>
          <div className="grid gap-3">
            {kinds.map((k) => {
              const gk = groupKey(p, k.key);
              const gPct = adjust.groups[gk] ?? 0;
              const prices = k.services.map((s) => priceOf(s, adjust));
              const isOpen = open === gk;
              const ownCount = k.services.filter((s) => adjust.services[String(s.providerId)]).length;
              return (
                <div key={gk} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : gk)}
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400 transition ${isOpen ? "rotate-90" : ""}`}
                      >
                        ›
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white">{k.label}</span>
                          <PctBadge pct={gPct} />
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {k.services.length} ta xizmat · 1000 dona: {som(Math.min(...prices))} – {som(Math.max(...prices))} söm
                          {ownCount > 0 && ` · ${ownCount} tasida alohida sozlama`}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {QUICK.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            setGroup(gk, q);
                            setInputKey((n) => n + 1);
                          }}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                            gPct === q
                              ? "bg-indigo-500 text-white"
                              : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {q > 0 ? `+${q}` : q === 0 ? "0" : `−${Math.abs(q)}`}%
                        </button>
                      ))}
                      <PctInput key={`${gk}-${inputKey}`} value={gPct || undefined} onChange={(v) => setGroup(gk, v)} />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto border-t border-white/5">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="text-left text-xs uppercase text-zinc-500">
                          <tr>
                            <th className="px-4 py-2">Xizmat</th>
                            <th className="px-4 py-2 text-right">Asosiy narx</th>
                            <th className="px-4 py-2 text-right">Öz foizi</th>
                            <th className="px-4 py-2 text-right">Saytda</th>
                            <th className="px-4 py-2 text-center">Körinadi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {k.services.map((s) => {
                            const own = adjust.services[String(s.providerId)];
                            const off = own?.off === true;
                            return (
                              <tr key={s.providerId} className={`border-t border-white/5 align-middle ${off ? "opacity-50" : ""}`}>
                                <td className="px-4 py-2">
                                  <div className="line-clamp-2 max-w-md text-zinc-200">{s.name}</div>
                                  <div className="text-xs text-zinc-500">
                                    ID {s.providerId} · {som(s.min)} – {som(s.max)} dona
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-right text-zinc-400">{som(basePrice(s))}</td>
                                <td className="px-4 py-2">
                                  <div className="flex justify-end">
                                    <PctInput
                                      key={`${s.providerId}-${inputKey}`}
                                      value={own?.pct}
                                      placeholder={gPct ? String(gPct) : "0"}
                                      onChange={(v) => setService(s.providerId, { pct: v })}
                                    />
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-white">
                                  {som(priceOf(s, adjust))}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!off}
                                    onClick={() => setService(s.providerId, { off: !off })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                      off ? "bg-white/10" : "bg-emerald-500"
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                                        off ? "translate-x-0.5" : "translate-x-[1.375rem]"
                                      }`}
                                    />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* saqlash paneli */}
      {(dirty || msg) && (
        <div className={`${msg && !dirty ? "flash-status " : ""}fixed inset-x-0 bottom-4 z-40 flex justify-center px-4`}>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-2xl backdrop-blur">
            {msg && !dirty ? (
              <span className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>
            ) : (
              <>
                <span className="text-sm text-zinc-300">Saqlanmagan özgarişlar bor</span>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => {
                    setAdjust(JSON.parse(saved));
                    setInputKey((n) => n + 1);
                    setMsg(null);
                  }}
                >
                  Bekor qiliş
                </button>
                <button type="button" className="btn-primary" disabled={busy} onClick={save}>
                  {busy ? "..." : "Saqlaş"}
                </button>
              </>
            )}
            {msg && !msg.ok && dirty && <span className="flash-status text-sm text-red-400">{msg.text}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
