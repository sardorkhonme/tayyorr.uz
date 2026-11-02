"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { activityLabel, ACTIVITY_GROUPS } from "@/lib/activity-labels";
import { shortDateTime } from "@/lib/date";

interface LogRow {
  id: string;
  action: string;
  summary: string;
  ip: string | null;
  device: string | null;
  createdAt: string;
}

export function ActivityLogPanel({ userId }: { userId: string }) {
  const [q, setQ] = useState("");
  const [groupIdx, setGroupIdx] = useState(0);
  const [action, setAction] = useState(""); // guruh ichidagi aniq tur ("" = guruh hammasi)
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const group = ACTIVITY_GROUPS[groupIdx];

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const mine = ++reqId.current;
      setLoading(true);
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (action) sp.set("action", action);
      sp.set("page", String(nextPage));
      try {
        const res = await fetch(
          `/api/admin/users/${userId}/logs?${sp.toString()}`,
        );
        const data = await res.json();
        if (mine !== reqId.current) return;
        setRows((prev) => (append ? [...prev, ...data.logs] : data.logs));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(data.page);
      } catch {
        if (mine === reqId.current && !append) setRows([]);
      } finally {
        if (mine === reqId.current) setLoading(false);
      }
    },
    [q, action, userId],
  );

  // qidiruv / filtr o'zgarsa — birinchi sahifadan qayta yuklaymiz (debounce)
  useEffect(() => {
    const t = setTimeout(() => load(0, false), 300);
    return () => clearTimeout(t);
  }, [load]);

  // guruhga tegishli aniq turlar ro'yxati (filtr uchun)
  const groupActions = group.actions;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">
          Harakatlar jurnali{" "}
          <span className="text-sm font-normal text-zinc-500">({total})</span>
        </h2>
      </div>

      {/* boshqaruv */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="input sm:max-w-xs"
          placeholder="Matn bo'yicha qidirish…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_GROUPS.map((g, i) => (
            <button
              key={g.label}
              type="button"
              onClick={() => {
                setGroupIdx(i);
                setAction("");
              }}
              className={`backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs transition ${
                i === groupIdx
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {groupActions.length > 0 && (
          <select
            className="input sm:max-w-[13rem]"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">— barcha turlar</option>
            {groupActions.map((a) => (
              <option key={a} value={a}>
                {activityLabel(a)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ro'yxat */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        {rows.length === 0 && !loading ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Yozuv topilmadi.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((r) => (
              <li key={r.id} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="mt-0.5 shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">
                  {activityLabel(r.action)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-zinc-200">{r.summary}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {shortDateTime(r.createdAt)}
                    {r.device ? ` · ${r.device}` : ""}
                    {r.ip ? ` · ${r.ip}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {loading && rows.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Yuklanmoqda…
          </p>
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          className="btn-ghost mt-3 w-full"
          disabled={loading}
          onClick={() => load(page + 1, true)}
        >
          {loading ? "..." : "Ko'proq ko'rsatish"}
        </button>
      )}
    </section>
  );
}
