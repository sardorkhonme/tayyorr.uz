"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { shortDateTime } from "@/lib/date";
import { Icon, StarIcon } from "@/components/icons";
import { MascotState } from "@/components/mascot";
import { useIsDesktop } from "@/components/use-media";
import {
  FilterChip,
  FilterFooter,
  FilterSection,
  useHeaderConfig,
  useHeaderSearch,
} from "@/components/page-header";
import { STATUS_CLS, STATUS_LABEL, TYPE_LABEL } from "@/lib/order-labels";

export interface OfferRow {
  id: string;
  orderId: string;
  title: string;
  type: string;
  orderStatus: string;
  orderDeleted: boolean;
  price: number;
  message: string | null;
  status: string;
  starsSpent: number;
  createdAt: string;
}

const ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "DELIVERED", "DONE", "CANCELLED"];

const OFFER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Körib çiqilmoqda", cls: "text-amber-300" },
  ACCEPTED: { label: "Qabul qilindi", cls: "text-emerald-400" },
  REJECTED: { label: "Rad etildi", cls: "text-red-400" },
  WITHDRAWN: { label: "Qaytarib olindi", cls: "text-zinc-400" },
};

type SortKey = "new" | "old" | "price" | "stars";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "new", label: "Yangi" },
  { key: "old", label: "Eski" },
  { key: "price", label: "Narx" },
  { key: "stars", label: "Star" },
];

export function OffersBrowser({
  offers,
  initialOrderStatus,
}: {
  offers: OfferRow[];
  initialOrderStatus: string | null;
}) {
  const isDesktop = useIsDesktop();
  const { open: headerSearchOpen, query: headerQuery } = useHeaderSearch();
  // kompyuterda — sahifadagi qidiruv maydoni, telefonda — header qidiruvi
  const [deskQ, setDeskQ] = useState("");
  const searching = !isDesktop && headerSearchOpen;
  const query = isDesktop ? deskQ : searching ? headerQuery : "";
  const [orderStatus, setOrderStatus] = useState<string | null>(
    initialOrderStatus && ORDER_STATUSES.includes(initialOrderStatus)
      ? initialOrderStatus
      : null,
  );
  const [offerStatus, setOfferStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("new");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = offers.filter((o) => {
      if (orderStatus && o.orderStatus !== orderStatus) return false;
      if (offerStatus && o.status !== offerStatus) return false;
      if (needle) {
        const hay = `${o.title} ${o.message ?? ""} ${
          TYPE_LABEL[o.type] ?? o.type
        }`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: OfferRow, b: OfferRow) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      old: (a, b) => a.createdAt.localeCompare(b.createdAt),
      price: (a, b) => b.price - a.price,
      stars: (a, b) => b.starsSpent - a.starsSpent,
    };
    return [...list].sort(by[sort]);
  }, [offers, query, orderStatus, offerStatus, sort]);

  const active = sort !== "new" || !!orderStatus || !!offerStatus;
  const reset = () => {
    setSort("new");
    setOrderStatus(null);
    setOfferStatus(null);
  };

  useHeaderConfig({
    title: "Mening takliflarim",
    search: { placeholder: "Takliflarimdan qidiriş…" },
    filter: {
      active,
      panel: (
        <>
          <FilterSection title="Saralaş">
            {SORTS.map((s) => (
              <FilterChip
                key={s.key}
                active={sort === s.key}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </FilterChip>
            ))}
          </FilterSection>
          <FilterSection title="Buyurtma holati">
            <FilterChip active={!orderStatus} onClick={() => setOrderStatus(null)}>
              Hammasi
            </FilterChip>
            {ORDER_STATUSES.map((s) => (
              <FilterChip
                key={s}
                active={orderStatus === s}
                onClick={() => setOrderStatus(s)}
              >
                {STATUS_LABEL[s]}
              </FilterChip>
            ))}
          </FilterSection>
          <FilterSection title="Taklif holati">
            <FilterChip active={!offerStatus} onClick={() => setOfferStatus(null)}>
              Hammasi
            </FilterChip>
            {Object.entries(OFFER_STATUS).map(([k, v]) => (
              <FilterChip
                key={k}
                active={offerStatus === k}
                onClick={() => setOfferStatus(k)}
              >
                {v.label}
              </FilterChip>
            ))}
          </FilterSection>
          <FilterFooter onReset={reset} disabled={!active} count={filtered.length} />
        </>
      ),
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ——— kompyuter: sarlavha, qidiruv va holat filtri sahifaning özida (asl körinişi) ——— */}
      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Mening takliflarim</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Siz yuborgan barça takliflar (arizalar) şu yerda.
        </p>
      </div>
      <div className="sticky top-4 z-20 hidden flex-col gap-2.5 rounded-2xl border border-white/10 bg-[var(--surface)] px-3 py-3 shadow-lg shadow-black/10 lg:flex">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="search"
            className="input pl-9"
            placeholder="Takliflarimdan qidiriş…"
            value={deskQ}
            onChange={(e) => setDeskQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {[null, ...ORDER_STATUSES].map((st) => (
              <button
                key={st ?? "ALL"}
                type="button"
                onClick={() => setOrderStatus(st)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  orderStatus === st
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {st ? STATUS_LABEL[st] : "Hammasi"}
              </button>
            ))}
          </div>
          <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-zinc-500">
            {filtered.length} ta
          </span>
        </div>
      </div>

      {/* ——— telefon/planşet: sarlavha + son (qidiruv/filtr headerda) ——— */}
      <div className="flex items-center justify-between gap-3 px-1 lg:hidden">
        <h2 className="min-w-0 truncate text-base font-semibold text-white">
          {searching && query.trim() ? "Qidiruv natijalari" : "Mening takliflarim"}
        </h2>
        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">{filtered.length} ta</span>
      </div>

      {filtered.length === 0 ? (
        offers.length === 0 ? (
          <MascotState
            pose="empty-offers"
            size={240}
            className="mascot-xl"
            title="Siz hali taklif yubormagansiz"
            message="Özingizga mos buyurtmani tanlab, birinçi taklifingizni yuboring."
          >
            <Link href="/dashboard" className="btn-primary">
              Buyurtmalarni köriş
            </Link>
          </MascotState>
        ) : (
          <MascotState
            pose="no-results"
            size={240}
            className="mascot-xl"
            title="Mos taklif topilmadi"
            message="Qidiruv sözini özgartirib yoki filtrni tozalab köring."
          >
            {(active || query) && (
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
          {filtered.map((o) => {
            const st = OFFER_STATUS[o.status] ?? { label: o.status, cls: "text-zinc-400" };
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.orderId}`}
                  className="card flex flex-col gap-3 transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{o.title}</div>
                      <div className="mt-1 truncate text-xs text-zinc-500">
                        {TYPE_LABEL[o.type] ?? o.type} · {shortDateTime(o.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        o.orderDeleted
                          ? "bg-red-500/15 text-red-300"
                          : STATUS_CLS[o.orderStatus] ?? "bg-white/10 text-zinc-300"
                      }`}
                    >
                      {o.orderDeleted ? "Öçirilgan" : STATUS_LABEL[o.orderStatus] ?? o.orderStatus}
                    </span>
                  </div>
                  {o.message && (
                    <p className="line-clamp-2 text-sm text-zinc-400">{o.message}</p>
                  )}
                  <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
                    <span className="truncate text-zinc-300">
                      <b className="text-white">{o.price.toLocaleString("ru-RU")} söm</b>
                      <span className={`ml-2 text-xs ${st.cls}`}>{st.label}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-300">
                      {o.starsSpent} <StarIcon className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
