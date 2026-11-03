"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { timeAgo } from "@/lib/time-ago";
import { useDismiss } from "@/components/use-dismiss";
import { useLocale } from "@/components/locale-provider";
import { Icon } from "@/components/icons";

const SORT_KEYS = ["new", "old", "offers", "budget"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const TYPE_LABEL: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs işi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom işi",
  OTHER: "Boşqa",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Oçiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topşirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

const OFFER_BUCKETS: { key: string; label: string; test: (n: number) => boolean }[] =
  [
    { key: "lt5", label: "5 tadan kam", test: (n) => n < 5 },
    { key: "5-10", label: "5 – 10 ta", test: (n) => n >= 5 && n <= 10 },
    { key: "10-50", label: "10 – 50 ta", test: (n) => n > 10 && n <= 50 },
    { key: "gt50", label: "50 tadan köp", test: (n) => n > 50 },
  ];

export interface OrderRow {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  budget: number | null;
  offers: number;
  createdAt: string;
  ordererLabel: string | null;
  deleted?: boolean;
  deleteReason?: string | null;
  deletedByRole?: string | null;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`backdrop-blur-sm rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-indigo-400 bg-indigo-500/20 text-white"
          : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function OrdersBrowser({
  orders,
  mine = false,
  newOrderHref,
  banner,
}: {
  orders: OrderRow[];
  mine?: boolean;
  newOrderHref?: string;
  banner?: React.ReactNode;
}) {
  const { t } = useLocale();
  const title = mine ? t("orders.title.mine") : t("orders.title.all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [buckets, setBuckets] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("new");
  const [gen, setGen] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), [sheetRef]);

  // saralash / filtr o'zgarganда ro'yxatni qayta "blur bilan" ochamiz
  useEffect(() => {
    setGen((g) => g + 1);
  }, [sort, types, buckets]);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  };

  const activeCount = types.size + buckets.size;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (types.size && !types.has(o.type)) return false;
      if (buckets.size) {
        const ok = OFFER_BUCKETS.some(
          (b) => buckets.has(b.key) && b.test(o.offers),
        );
        if (!ok) return false;
      }
      if (needle) {
        const hay = `${o.title} ${o.description} ${
          TYPE_LABEL[o.type] ?? o.type
        }`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: OrderRow, b: OrderRow) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      old: (a, b) => a.createdAt.localeCompare(b.createdAt),
      offers: (a, b) => b.offers - a.offers,
      budget: (a, b) => (b.budget ?? 0) - (a.budget ?? 0),
    };
    return [...list].sort(by[sort]);
  }, [orders, q, types, buckets, sort]);

  return (
    <div className="flex flex-col gap-3">
      {banner}
      <div className="sticky top-[4.75rem] z-20 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0b0b12]/25 px-3 py-3 backdrop-blur-2xl sm:top-[5.25rem] lg:top-4">
        {(title || newOrderHref) && (
          <div className="flex items-center justify-between gap-2">
            {title && (
              <h1 className="text-lg font-semibold tracking-tight text-white">
                {title}
              </h1>
            )}
            {newOrderHref && (
              <Link href={newOrderHref} className="btn-primary shrink-0 text-sm">
                {t("orders.new")}
              </Link>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input min-w-0 flex-1"
            placeholder={t("orders.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-ghost shrink-0"
          >
            {t("orders.filter")}
            {activeCount > 0 && ` · ${activeCount}`}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SORT_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                sort === k
                  ? "bg-indigo-500/20 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {t(`sort.${k}`)}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-600">
            {filtered.length} {t("orders.count")}
          </span>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...types].map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300"
            >
              {TYPE_LABEL[t] ?? t}
              <button
                type="button"
                onClick={() => setTypes((s) => toggle(s, t))}
                className="text-zinc-500 hover:text-white"
                aria-label="Olib taşlaş"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {[...buckets].map((b) => (
            <span
              key={b}
              className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300"
            >
              {OFFER_BUCKETS.find((x) => x.key === b)?.label ?? b}
              <button
                type="button"
                onClick={() => setBuckets((s) => toggle(s, b))}
                className="text-zinc-500 hover:text-white"
                aria-label="Olib taşlaş"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              setTypes(new Set());
              setBuckets(new Set());
            }}
            className="rounded-full px-2.5 py-1 text-xs text-zinc-500 hover:text-white"
          >
            Tozalaş
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-sm text-zinc-500">
          {orders.length === 0 ? t("orders.empty") : t("orders.noMatch")}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((o, idx) => (
            <li
              key={`${gen}:${o.id}`}
              className={gen === 0 ? "blur-in" : "blur-in-now"}
              style={
                gen === 0
                  ? undefined
                  : { ["--rd" as string]: `${Math.min(idx, 12) * 45}ms` }
              }
            >
              <Link
                href={`/orders/${o.id}`}
                className={`card flex items-center justify-between gap-4 transition hover:border-white/15 hover:bg-white/[0.06] ${
                  o.deleted ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {o.deleted && (
                      <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                        ÖÇIRILGAN
                      </span>
                    )}
                    <span className="truncate font-medium text-white">
                      {o.title}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {TYPE_LABEL[o.type] ?? o.type} ·{" "}
                    {o.deleted
                      ? "öçirilgan"
                      : STATUS_LABEL[o.status] ?? o.status}
                    {o.ordererLabel && ` · @${o.ordererLabel}`}
                    {o.budget ? ` · ${o.budget.toLocaleString()} söm` : ""}
                  </div>
                  {o.deleted && o.deleteReason ? (
                    <div className="mt-1 text-[11px] text-red-300/80">
                      Sabab: {o.deleteReason}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-zinc-600">
                      {timeAgo(o.createdAt)} · {o.offers} taklif
                    </div>
                  )}
                </div>
                {!o.deleted && (
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">
                    {o.offers} taklif
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={sheetRef}
            className="pop-in w-full max-w-md overflow-hidden rounded-t-2xl border border-white/10 bg-[#14141b] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Filtr</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-white"
                aria-label="Yopiş"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Işning turi
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TYPE_LABEL).map(([key, label]) => (
                    <Chip
                      key={key}
                      active={types.has(key)}
                      onClick={() => setTypes((s) => toggle(s, key))}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Topşirganlar soni
                </div>
                <div className="flex flex-wrap gap-2">
                  {OFFER_BUCKETS.map((b) => (
                    <Chip
                      key={b.key}
                      active={buckets.has(b.key)}
                      onClick={() => setBuckets((s) => toggle(s, b.key))}
                    >
                      {b.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setTypes(new Set());
                  setBuckets(new Set());
                }}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Hammasini tozalaş
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary"
              >
                Körsatiş ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
