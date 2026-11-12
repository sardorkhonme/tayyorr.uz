"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

import { Icon, type IconName } from "@/components/icons";
import { useDismiss } from "@/components/use-dismiss";

/**
 * Sahifaga xos header amallari (qidiruv, filtr, "+", qo'llanma va h.k.) — FAQAT
 * telefon/planşetda (lg dan kichik): kompyuterda header yo'q, qidiruv va filtr
 * sahifaning o'zida turadi.
 * Header layout'da turadi, sahifa esa o'z amallarini shu kontekst orqali
 * "ro'yxatdan o'tkazadi" — mobil ilovadagi AppBar actions bilan bir xil.
 */
export interface HeaderConfig {
  /** sahifa nomi (qidiruv maydoni va ekran o'quvchilar uchun) */
  title?: string;
  /** qidiruv ikonkasi — bosilganda header qidiruv maydoniga aylanadi */
  search?: { placeholder: string };
  /** filtr ikonkasi + ochiladigan panel */
  filter?: { active: boolean; panel: React.ReactNode };
  /** qo'shimcha ikonkalar (bir guruh ichida, qidiruv/filtrdan oldin) */
  actions?: HeaderAction[];
}

export interface HeaderAction {
  key: string;
  icon: IconName;
  label: string;
  href: string;
}

interface SearchState {
  open: boolean;
  query: string;
  setOpen: (v: boolean) => void;
  setQuery: (v: string) => void;
}

const SetConfigCtx = createContext<(c: HeaderConfig | null) => void>(() => {});
const ConfigCtx = createContext<HeaderConfig | null>(null);
const SearchCtx = createContext<SearchState>({
  open: false,
  query: "",
  setOpen: () => {},
  setQuery: () => {},
});

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  // boshqa sahifaga o'tganda qidiruv yopiladi
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  const search = useMemo<SearchState>(
    () => ({ open, query, setOpen, setQuery }),
    [open, query],
  );

  return (
    <SetConfigCtx.Provider value={setConfig}>
      <ConfigCtx.Provider value={config}>
        <SearchCtx.Provider value={search}>{children}</SearchCtx.Provider>
      </ConfigCtx.Provider>
    </SetConfigCtx.Provider>
  );
}

/** Sahifa header amallarini o'rnatadi (sahifadan chiqqanda tozalanadi). */
export function useHeaderConfig(config: HeaderConfig | null) {
  const set = useContext(SetConfigCtx);
  useEffect(() => {
    set(config);
  }, [set, config]);
  useEffect(() => () => set(null), [set]);
}

export const useHeaderSearch = () => useContext(SearchCtx);
export const useHeaderConfigValue = () => useContext(ConfigCtx);

/** Server sahifalari uchun — faqat havola-ikonkalar va sarlavha. */
export function HeaderSetter({
  title,
  actions,
}: {
  title?: string;
  actions?: HeaderAction[];
}) {
  const key = JSON.stringify({ title, actions });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = useMemo<HeaderConfig>(() => ({ title, actions }), [key]);
  useHeaderConfig(config);
  return null;
}

/* ------------------------------------------------------------------ */
/* Header ichidagi UI                                                  */
/* ------------------------------------------------------------------ */

/** Mobil ilovadagi kabi: har bir ikonka 48×48 bosiş maydoni, ikonka 21px. */
const ICON_BTN =
  "relative flex h-12 w-12 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 hover:text-white active:scale-95";

/** Header kapsulasi (logo, ikonkalar guruhi, qidiruv maydoni) — tekis sirt + ingiçka çegara. */
export const HEADER_CAPSULE =
  "border border-white/10 bg-[var(--surface)] shadow-lg shadow-black/15";

/** Çapga strelka (iOS uslubidagi «orqaga»). */
export function BackChevron({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** Barcha ikonkalar bitta kapsula ichida, orasida ingichka ajratgich (ilovadagi HeaderIconGroup). */
export function HeaderIconGroup({ config }: { config: HeaderConfig }) {
  const { setOpen } = useHeaderSearch();
  const items: React.ReactNode[] = [];

  for (const a of config.actions ?? []) {
    items.push(
      <Link key={a.key} href={a.href} aria-label={a.label} title={a.label} className={ICON_BTN}>
        <Icon name={a.icon} className="h-[21px] w-[21px]" />
      </Link>,
    );
  }
  if (config.search) {
    items.push(
      <button
        key="search"
        type="button"
        aria-label="Qidiriş"
        title="Qidiriş"
        onClick={() => setOpen(true)}
        className={ICON_BTN}
      >
        <Icon name="search" className="h-[21px] w-[21px]" />
      </button>,
    );
  }
  if (config.filter) {
    items.push(<FilterButton key="filter" filter={config.filter} />);
  }
  if (items.length === 0) return null;

  return (
    <div data-header-group className={`flex h-12 shrink-0 items-center rounded-full ${HEADER_CAPSULE}`}>
      {items.map((node, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span aria-hidden className="h-5 w-px bg-white/10" />}
          {node}
        </span>
      ))}
    </div>
  );
}

function FilterButton({
  filter,
  standalone = false,
}: {
  filter: NonNullable<HeaderConfig["filter"]>;
  standalone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0, maxH: 480 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), [btnRef, panelRef]);

  function toggle() {
    if (open) return setOpen(false);
    // menyu ikonkalar guruhining öng çetiga tekislanib, 8px pastda çiqadi
    const group = btnRef.current?.closest("[data-header-group]") ?? btnRef.current;
    const r = group?.getBoundingClientRect();
    if (r) {
      const top = r.bottom + 8;
      setPos({
        top,
        right: Math.max(12, window.innerWidth - r.right),
        maxH: Math.max(240, window.innerHeight - top - 110),
      });
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Filtr"
        title="Filtr"
        aria-expanded={open}
        onClick={toggle}
        className={`${ICON_BTN} ${open || filter.active ? "text-indigo-300" : ""} ${
          standalone ? `shrink-0 ${HEADER_CAPSULE}` : ""
        }`}
      >
        <Icon name="sliders" className="h-[21px] w-[21px]" />
        {filter.active && (
          <span className="absolute right-3 top-3 h-[7px] w-[7px] rounded-full bg-indigo-500" />
        )}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="menu-backdrop fixed inset-0 z-[74] bg-black/35"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              className="pop-in fixed z-[75] w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-white/10 bg-[var(--surface-2)] shadow-2xl shadow-black/40"
              style={{ top: pos.top, right: pos.right }}
            >
              <div className="overflow-y-auto p-4" style={{ maxHeight: pos.maxH }}>
                {filter.panel}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

/** Qidiruv rejimi: header to'liq qidiruv maydoniga aylanadi (ilovadagi HeaderSearchField). */
export function HeaderSearchBar({ config }: { config: HeaderConfig }) {
  const { query, setQuery, setOpen } = useHeaderSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="pop-in flex min-w-0 flex-1 items-center gap-2" data-header-group>
      <button
        type="button"
        aria-label="Qidiruvni yopiş"
        onClick={close}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:text-white active:scale-95 ${HEADER_CAPSULE}`}
      >
        <BackChevron className="h-[19px] w-[19px]" />
      </button>
      <label className={`flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full pl-4 pr-1 ${HEADER_CAPSULE}`}>
        <Icon name="search" className="h-[19px] w-[19px] shrink-0 text-zinc-500" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          placeholder={config.search?.placeholder ?? "Qidiriş…"}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            aria-label="Tozalaş"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:text-white"
          >
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span className="w-3" />
        )}
      </label>
      {config.filter && <FilterButton filter={config.filter} standalone />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filtr paneli ichidagi bo'limlar (barcha sahifalarda bir xil)       */
/* ------------------------------------------------------------------ */

export function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="[&+&]:mt-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function FilterChip({
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
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-indigo-400/60 bg-indigo-500/20 text-white"
          : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterFooter({
  onReset,
  disabled,
  count,
}: {
  onReset: () => void;
  disabled: boolean;
  count: number;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
      <span className="text-xs text-zinc-500">{count} ta natija</span>
      <button
        type="button"
        onClick={onReset}
        disabled={disabled}
        className="text-xs font-medium text-indigo-300 hover:underline disabled:opacity-40 disabled:no-underline"
      >
        Tozalaş
      </button>
    </div>
  );
}
