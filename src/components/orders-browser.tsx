"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { timeAgo } from "@/lib/time-ago";
import { useLocale } from "@/components/locale-provider";
import { Icon } from "@/components/icons";
import { MascotState } from "@/components/mascot";
import {
  FilterChip,
  FilterFooter,
  FilterSection,
  useHeaderConfig,
  useHeaderSearch,
  type HeaderConfig,
} from "@/components/page-header";
import { STATUS_CLS, STATUS_LABEL, TYPE_LABEL } from "@/lib/order-labels";

const SORT_KEYS = ["new", "old", "offers", "budget"] as const;
type SortKey = (typeof SORT_KEYS)[number];

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

const toggle = (set: Set<string>, key: string) => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

/**
 * Buyurtmalar ro'yxati. Qidiruv va filtr — headerdagi ikonkalar orqali
 * (alohida "Buyurtmalar" qutisi yo'q).
 *  - variant="feed": ochiq buyurtmalar lentasi (tayyorlovchi; buyurtmachiga
 *    faqat ko'rish uchun) — qidiruv + filtr
 *  - variant="mine": buyurtmachining o'z buyurtmalari — "+" va qidiruv
 */
export function OrdersBrowser({
  orders,
  variant = "feed",
  banner,
  newOrderHref,
}: {
  orders: OrderRow[];
  variant?: "feed" | "mine";
  banner?: React.ReactNode;
  newOrderHref?: string;
}) {
  const { t } = useLocale();
  const { open: searching, query } = useHeaderSearch();
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [buckets, setBuckets] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("new");
  const [gen, setGen] = useState(0);
  const mine = variant === "mine";

  // saralash / filtr o'zgarganda ro'yxatni qayta "blur bilan" ochamiz
  useEffect(() => {
    setGen((g) => g + 1);
  }, [sort, types, buckets]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
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
  }, [orders, query, types, buckets, sort]);

  const filterActive = sort !== "new" || types.size > 0 || buckets.size > 0;
  const reset = () => {
    setSort("new");
    setTypes(new Set());
    setBuckets(new Set());
  };

  const filterPanel = (
    <>
      <FilterSection title="Saralaş">
        {SORT_KEYS.map((k) => (
          <FilterChip key={k} active={sort === k} onClick={() => setSort(k)}>
            {t(`sort.${k}`)}
          </FilterChip>
        ))}
      </FilterSection>
      <FilterSection title="Işning turi">
        {Object.entries(TYPE_LABEL).map(([key, label]) => (
          <FilterChip
            key={key}
            active={types.has(key)}
            onClick={() => setTypes((s) => toggle(s, key))}
          >
            {label}
          </FilterChip>
        ))}
      </FilterSection>
      <FilterSection title="Takliflar soni">
        {OFFER_BUCKETS.map((b) => (
          <FilterChip
            key={b.key}
            active={buckets.has(b.key)}
            onClick={() => setBuckets((s) => toggle(s, b.key))}
          >
            {b.label}
          </FilterChip>
        ))}
      </FilterSection>
      <FilterFooter
        onReset={reset}
        disabled={!filterActive}
        count={filtered.length}
      />
    </>
  );

  const title = mine ? t("orders.title.mine") : t("orders.title.all");
  const config: HeaderConfig = mine
    ? {
        title,
        actions: newOrderHref
          ? [{ key: "new", icon: "plus", label: "Buyurtma yaratiş", href: newOrderHref }]
          : undefined,
        search: { placeholder: "Buyurtmalarimdan qidiriş…" },
      }
    : {
        title,
        search: { placeholder: t("orders.search") },
        filter: { active: filterActive, panel: filterPanel },
      };
  useHeaderConfig(config);

  if (mine && orders.length === 0) {
    return <MyOrdersEmpty href={newOrderHref ?? "/orders/new"} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {!searching && banner}

      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-base font-semibold text-white">
          {searching && query.trim() ? "Qidiruv natijalari" : title}
        </h2>
        <span className="text-xs text-zinc-500">
          {filtered.length} {t("orders.count")}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          {orders.length === 0 ? (
            <MascotState
              pose="empty-feed"
              size={140}
              title={t("orders.empty")}
              message="Yangi buyurtmalar paydo bölişi bilan şu yerda körinadi."
            />
          ) : (
            <MascotState
              pose="no-results"
              size={140}
              title={t("orders.noMatch")}
              message="Qidiruv sözini özgartirib yoki filtrni tozalab köring."
            >
              {filterActive && (
                <button type="button" onClick={reset} className="btn-ghost">
                  Filtrni tozalaş
                </button>
              )}
            </MascotState>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((o, idx) => (
            <li
              key={`${gen}:${o.id}`}
              className={gen <= 1 ? "blur-in" : "blur-in-now"}
              style={
                gen <= 1
                  ? undefined
                  : { ["--rd" as string]: `${Math.min(idx, 12) * 45}ms` }
              }
            >
              <OrderCard o={o} showStatus={mine} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ o, showStatus }: { o: OrderRow; showStatus: boolean }) {
  const meta = [
    TYPE_LABEL[o.type] ?? o.type,
    o.ordererLabel ? `@${o.ordererLabel}` : null,
    timeAgo(o.createdAt),
  ].filter(Boolean);

  return (
    <Link
      href={`/orders/${o.id}`}
      className={`card flex items-center gap-3 transition hover:border-white/15 hover:bg-white/[0.06] sm:gap-4 ${
        o.deleted ? "opacity-60" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
        <Icon name="file" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-white">{o.title}</div>
        <div className="mt-1 truncate text-xs text-zinc-500">
          {meta.join(" · ")}
        </div>
        {o.deleted && o.deleteReason && (
          <div className="mt-1 truncate text-[11px] text-red-300/80">
            Sabab: {o.deleteReason}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {o.deleted ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
            Öçirilgan
          </span>
        ) : showStatus ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              STATUS_CLS[o.status] ?? "bg-white/10 text-zinc-300"
            }`}
          >
            {STATUS_LABEL[o.status] ?? o.status}
          </span>
        ) : null}
        <span className="whitespace-nowrap text-xs text-zinc-400">
          {o.budget ? `${o.budget.toLocaleString("ru-RU")} söm · ` : ""}
          {o.offers} taklif
        </span>
      </div>
    </Link>
  );
}

/** Buyurtmachida hali buyurtma yo'q — maskot + tugma. */
function MyOrdersEmpty({ href }: { href: string }) {
  return (
    <div className="card">
      <MascotState
        pose="empty-orders"
        size={200}
        title="Hali buyurtmangiz yöq"
        message="Birinçi buyurtmangizni yarating — tayyorlovçilar takliflarini şu yerda körasiz."
      >
        <Link href={href} className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Buyurtma yaratiş
        </Link>
      </MascotState>
    </div>
  );
}
