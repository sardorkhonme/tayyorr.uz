"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlatformIcon } from "@/components/platform-icon";
import { OrderDialog } from "@/components/order-dialog";
import { num, som } from "@/lib/format";
import { PLATFORMS } from "@/lib/platforms";

export type BoardService = {
  id: string;
  platform: string;
  category: string;
  name: string;
  description: string | null;
  rate: number;
  min: number;
  max: number;
  refill: boolean;
};

export function ServicesBoard({
  services,
  loggedIn,
  balance,
}: {
  services: BoardService[];
  loggedIn: boolean;
  balance: number;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of services) m.set(s.platform, (m.get(s.platform) ?? 0) + 1);
    return m;
  }, [services]);

  const visiblePlatforms = PLATFORMS.filter((p) => p.key !== "other" || counts.get("other"));
  const firstWithServices = visiblePlatforms.find((p) => counts.get(p.key))?.key ?? "instagram";

  const [platform, setPlatform] = useState(firstWithServices);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BoardService | null>(null);
  const [wallet, setWallet] = useState(balance);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = services.filter(
      (s) =>
        (q ? true : s.platform === platform) &&
        (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    );
    const m = new Map<string, BoardService[]>();
    for (const s of list) {
      const arr = m.get(s.category) ?? [];
      arr.push(s);
      m.set(s.category, arr);
    }
    return [...m.entries()];
  }, [services, platform, query]);

  return (
    <section className="space-y-8">
      {/* platformalar — katta bloklar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {visiblePlatforms.map((p, i) => {
          const n = counts.get(p.key) ?? 0;
          const active = !query && platform === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={!n}
              onClick={() => {
                setPlatform(p.key);
                setQuery("");
              }}
              data-active={active}
              style={{ "--from": p.from, animationDelay: `${i * 50}ms` } as React.CSSProperties}
              className="platform-tile card animate-rise flex flex-col items-start gap-4 !p-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
              >
                <PlatformIcon platform={p.key} />
              </span>
              <span>
                <span className="block font-display text-[15px] font-semibold text-white">{p.name}</span>
                <span className="text-xs text-zinc-500">{n ? `${n} ta xizmat` : "Tez orada"}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-semibold text-white">
          {query ? "Qidiruv natijalari" : `${PLATFORMS.find((p) => p.key === platform)?.name} xizmatlari`}
        </h2>
        <input
          className="input sm:max-w-xs"
          placeholder="Xizmatni qidirish…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {services.length === 0 ? (
        <div className="card py-14 text-center">
          <p className="font-display text-lg text-white">Xizmatlar tez orada qo'shiladi</p>
          <p className="mt-1 text-sm text-zinc-500">Hozircha ro'yxat bo'sh — biroz keyinroq qayting.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card py-10 text-center text-sm text-zinc-500">Hech narsa topilmadi</div>
      ) : (
        groups.map(([category, list]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">{category}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  className="card group flex flex-col gap-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/[0.05]"
                >
                  <span className="line-clamp-2 text-[15px] font-medium leading-snug text-zinc-100">
                    {s.name}
                  </span>
                  <span className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-zinc-400">
                      {num(s.min)} – {num(s.max)} dona
                    </span>
                    {s.refill && (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                        Kafolat (refill)
                      </span>
                    )}
                  </span>
                  <span className="mt-auto flex items-end justify-between">
                    <span>
                      <span className="block font-display text-lg font-semibold text-white">{som(s.rate)}</span>
                      <span className="text-xs text-zinc-500">1000 dona uchun</span>
                    </span>
                    <span className="rounded-lg bg-indigo-500/15 px-3 py-1.5 text-sm text-indigo-200 transition group-hover:bg-indigo-500 group-hover:text-white">
                      Buyurtma
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {selected && (
        <OrderDialog
          service={selected}
          loggedIn={loggedIn}
          balance={wallet}
          onClose={() => setSelected(null)}
          onOrdered={setWallet}
        />
      )}

      {!loggedIn && (
        <p className="text-center text-sm text-zinc-500">
          Buyurtma berish uchun{" "}
          <Link href="/login" className="text-indigo-300 hover:underline">
            tayyorr.uz hisobingiz bilan kiring
          </Link>
        </p>
      )}
    </section>
  );
}
