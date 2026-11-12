"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { timeAgo } from "@/lib/time-ago";
import { useLocale } from "@/components/locale-provider";
import { Icon } from "@/components/icons";
import { MascotState } from "@/components/mascot";
import { useDismiss } from "@/components/use-dismiss";
import { useIsDesktop } from "@/components/use-media";
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
 * Buyurtmalar ro'yxati.
 *  - kompyuterda (lg+): bannerdan pastda — sarlavha, qidiruv maydoni, «Filtr»
 *    tugmasi va saralaş (asl körinişi), filtr — oyna.
 *  - telefon/planşetda: qidiruv va filtr — headerdagi ikonkalar (mobil ilova
 *    kabi); qidiruv oçilsa banner yashirinadi, natijalar töliq ekranda.
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
  const isDesktop = useIsDesktop();
  const { open: headerSearchOpen, query: headerQuery } = useHeaderSearch();
  // kompyuterda — sahifadagi qidiruv maydoni, telefonda — header qidiruvi
  const [deskQ, setDeskQ] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  useDismiss(sheetOpen, () => setSheetOpen(false), [sheetRef]);
  const searching = !isDesktop && headerSearchOpen;
  const query = isDesktop ? deskQ : searching ? headerQuery : "";
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
    return <MyOrdersEmpty href={newOrderHref ?? "/orders/new"} title={title} />;
  }

  const activeCount = types.size + buckets.size;

  return (
    <div className="flex flex-col gap-4">
      {!searching && banner}

      {/* ——— kompyuter: sahifadagi qidiruv + filtr (asl körinişi) ——— */}
      <div className="sticky top-4 z-20 hidden flex-col gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-3 py-3 shadow-lg shadow-black/10 lg:flex">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-lg font-semibold tracking-tight text-white">{title}</h1>
          {newOrderHref && (
            <Link href={newOrderHref} className="btn-primary shrink-0 whitespace-nowrap text-sm">
              {t("orders.new")}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="search"
              className="input pl-9"
              placeholder={mine ? "Buyurtmalarimdan qidiriş…" : t("orders.search")}
              value={deskQ}
              onChange={(e) => setDeskQ(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="btn-ghost shrink-0 whitespace-nowrap"
          >
            <Icon name="sliders" className="h-4 w-4" />
            {t("orders.filter")}
            {activeCount > 0 && ` · ${activeCount}`}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {SORT_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition ${
                  sort === k
                    ? "bg-indigo-500/20 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {t(`sort.${k}`)}
              </button>
            ))}
          </div>
          <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-zinc-500">
            {filtered.length} {t("orders.count")}
          </span>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="hidden flex-wrap gap-1.5 lg:flex">
          {[...types].map((k) => (
            <ActiveChip key={k} onRemove={() => setTypes((s) => toggle(s, k))}>
              {TYPE_LABEL[k] ?? k}
            </ActiveChip>
          ))}
          {[...buckets].map((k) => (
            <ActiveChip key={k} onRemove={() => setBuckets((s) => toggle(s, k))}>
              {OFFER_BUCKETS.find((x) => x.key === k)?.label ?? k}
            </ActiveChip>
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

      {/* ——— telefon/planşet: sarlavha + son (qidiruv/filtr headerda) ——— */}
      <div className="flex items-center justify-between gap-3 px-1 lg:hidden">
        <h2 className="min-w-0 truncate text-base font-semibold text-white">
          {searching && query.trim() ? "Qidiruv natijalari" : title}
        </h2>
        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
          {filtered.length} {t("orders.count")}
        </span>
      </div>

      {filtered.length === 0 ? (
        orders.length === 0 ? (
          <MascotState
            pose="empty-feed"
            size={240}
            className="mascot-xl"
            title={t("orders.empty")}
            message="Yangi buyurtmalar paydo bölişi bilan şu yerda körinadi."
          />
        ) : (
          <MascotState
            pose="no-results"
            size={240}
            className="mascot-xl"
            title={t("orders.noMatch")}
            message="Qidiruv sözini özgartirib yoki filtrni tozalab köring."
          >
            {(filterActive || query) && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setDeskQ("");
                }}
                className="btn-ghost"
              >
                Filtrni tozalaş
              </button>
            )}
          </MascotState>
        )
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

      {/* kompyuter: filtr oynasi (asl körinişi) */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSheetOpen(false)}
        >
          <div
            ref={sheetRef}
            className="pop-in w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-2)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Filtr</h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="text-zinc-500 hover:text-white"
                aria-label="Yopiş"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
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
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-primary">
                Körsatiş ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="text-zinc-500 hover:text-white"
        aria-label="Olib taşlaş"
      >
        <Icon name="close" className="h-3.5 w-3.5" />
      </button>
    </span>
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

/** Buyurtmachida hali buyurtma yo'q — maskot + tugma (qutisiz, katta). */
function MyOrdersEmpty({ href, title }: { href: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="hidden px-1 text-2xl font-semibold tracking-tight text-white lg:block">{title}</h1>
      <MascotState
        pose="empty-orders"
        size={260}
        className="mascot-xl"
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
