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
 * Sahifaga xos header amallari (qidiruv, filtr, "+", qo'llanma va h.k.).
 * Header layout'da turadi, sahifa esa o'z amallarini shu kontekst orqali
 * "ro'yxatdan o'tkazadi" — mobil ilovadagi AppBar actions bilan bir xil.
 */
export interface HeaderConfig {
  /** kompyuterda (sidebar bor, logo yo'q) chap tomonda chiqadigan sarlavha */
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

const ICON_BTN =
  "relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-white/10 hover:text-white";

/** Barcha ikonkalar bitta yumaloq quti ichida (segmentli guruh). */
export function HeaderIconGroup({ config }: { config: HeaderConfig }) {
  const { setOpen } = useHeaderSearch();
  const items: React.ReactNode[] = [];

  for (const a of config.actions ?? []) {
    items.push(
      <Link key={a.key} href={a.href} aria-label={a.label} title={a.label} className={ICON_BTN}>
        <Icon name={a.icon} className="h-[18px] w-[18px]" />
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
        <Icon name="search" className="h-[18px] w-[18px]" />
      </button>,
    );
  }
  if (config.filter) {
    items.push(<FilterButton key="filter" filter={config.filter} />);
  }
  if (items.length === 0) return null;

  return (
    <div className="flex h-9 shrink-0 items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 p-0.5">
      {items.map((node, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span aria-hidden className="h-4 w-px bg-white/10" />}
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
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), [btnRef, panelRef]);

  function toggle() {
    if (open) return setOpen(false);
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setPos({
        top: r.bottom + 8,
        right: Math.max(12, window.innerWidth - r.right),
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
        className={`${ICON_BTN} ${open ? "bg-white/10 text-white" : ""} ${
          standalone ? "h-9 w-9 rounded-xl border border-white/10 bg-white/5" : ""
        }`}
      >
        <Icon name="sliders" className="h-[18px] w-[18px]" />
        {filter.active && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-[var(--surface)]" />
        )}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="pop-in fixed z-[75] w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-2)] shadow-2xl shadow-black/40"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="max-h-[70vh] overflow-y-auto p-4">{filter.panel}</div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Qidiruv rejimi: header to'liq qidiruv maydoniga aylanadi. */
export function HeaderSearchBar({ config }: { config: HeaderConfig }) {
  const { query, setQuery, setOpen } = useHeaderSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <button
        type="button"
        aria-label="Qidiruvni yopiş"
        onClick={() => {
          setOpen(false);
          setQuery("");
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
      <div className="relative min-w-0 flex-1">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
          placeholder={config.search?.placeholder ?? "Qidiriş…"}
          className="input h-9 py-0 pl-9"
        />
      </div>
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
