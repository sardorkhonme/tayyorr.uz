"use client";

import { useMemo, useState } from "react";

export type Recipient = {
  id: string;
  name: string;
  login: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  balance: number;
  createdAt: string;
};

const ROLE: Record<string, string> = { ORDERER: "Buyurtmaçi", PREPARER: "Tayyorlovçi" };

/** Ommaviy xabar oluvchilari: hammasi belgilangan, keraksizini olib tashlash, qidiruv. */
export function BroadcastRecipients({
  list,
  selected,
  onChange,
}: {
  list: Recipient[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((u) =>
      [u.name, u.login, u.email, u.role ? ROLE[u.role] : "", String(u.balance)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [list, q]);

  const shownAll = shown.length > 0 && shown.every((u) => selected.has(u.id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }
  function toggleShown() {
    const next = new Set(selected);
    for (const u of shown) {
      if (shownAll) next.delete(u.id);
      else next.add(u.id);
    }
    onChange(next);
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-zinc-400">
          Tanlangan: <span className="font-semibold text-white">{selected.size}</span> / {list.length}
        </span>
        <div className="flex gap-1.5">
          <button type="button" className="rounded-lg px-2 py-1 text-violet-300 hover:bg-white/5" onClick={() => onChange(new Set(list.map((u) => u.id)))}>
            Hammasini belgilaş
          </button>
          <button type="button" className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/5" onClick={() => onChange(new Set())}>
            Tozalaş
          </button>
        </div>
      </div>
      <input className="input !py-1.5 text-sm" placeholder="Qidiruv: ism, login, email, rol, balans" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim() && shown.length > 0 && (
        <button type="button" onClick={toggleShown} className="self-start rounded-lg px-2 py-1 text-xs text-violet-300 hover:bg-white/5">
          {shownAll ? `Topilganlarni (${shown.length}) olib taşlaş` : `Topilganlarni (${shown.length}) belgilaş`}
        </button>
      )}
      <div className="max-h-72 overflow-y-auto rounded-lg">
        {shown.length === 0 && <p className="py-4 text-center text-xs text-zinc-500">Heç kim topilmadi</p>}
        {shown.map((u) => {
          const on = selected.has(u.id);
          return (
            <label key={u.id} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 ${on ? "" : "opacity-50"}`}>
              <input type="checkbox" className="h-4 w-4 shrink-0 accent-violet-500" checked={on} onChange={() => toggle(u.id)} />
              {u.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.image} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                  {u.name.trim()[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white">{u.name}</span>
                <span className="block truncate text-[11px] text-zinc-500">
                  {u.login ? `@${u.login}` : u.email ?? ""}
                  {u.role ? ` · ${ROLE[u.role] ?? u.role}` : ""} · {u.balance.toLocaleString("ru-RU")} söm
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
