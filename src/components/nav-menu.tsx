"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

import { useLocale } from "@/components/locale-provider";
import { PowerIcon } from "@/components/icons";

export interface NavLink {
  href: string;
  label: string;
  tkey?: string;
  icon: string;
  badge?: number;
}

/**
 * Barcha qurilmalarda: o'ng tarafdagi menyu tugmasi + animatsiyali panel.
 * Panel va fon (backdrop) Portal orqali <body>ga chiqariladi — aks holda
 * headerdagi backdrop-blur qatlami "fixed" elementlar uchun o'z konteyner
 * chegarasini yaratib qo'yadi va tashqariga bosish backdropga yetib
 * bormay, menyu yopilmay qoladi (ayniqsa mobilda sezilarli).
 */
export function NavMenu({
  links,
  onSignOut,
  footer,
  topSlot,
}: {
  links: NavLink[];
  onSignOut?: () => void;
  footer?: React.ReactNode;
  /** Havolalar ro'yxatidan OLDIN chiqadigan qo'shimcha qator (masalan star). */
  topSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { t } = useLocale();
  const hasBadge = links.some((l) => !!l.badge && l.badge > 0);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 160);
  }

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setAnchor({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        aria-label="Menyu"
        aria-expanded={open}
        className="backdrop-blur-sm relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
      >
        {hasBadge && !open && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-[#0b0b12]" />
        )}
        <span className="relative flex h-3.5 w-4 flex-col justify-between">
          <span
            className={`h-0.5 w-full rounded bg-current transition-all duration-200 ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-full rounded bg-current transition-all duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-full rounded bg-current transition-all duration-200 ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="menu-backdrop fixed inset-0 z-[70] bg-black/50"
              onClick={close}
            />
            <div
              className={`menu-panel fixed z-[71] w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e16]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-2xl ${
                closing ? "closing" : ""
              }`}
              style={{ top: anchor.top, right: anchor.right }}
            >
              {topSlot && (
                <>
                  <div onClick={close}>{topSlot}</div>
                  <div className="my-1 h-px bg-white/10" />
                </>
              )}
              {links.map((l, i) => {
                const active =
                  pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    style={{ ["--i" as string]: i }}
                    className={`backdrop-blur-sm menu-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-indigo-500/15 text-white"
                        : "text-zinc-300 hover:bg-white/5 hover:pl-4"
                    }`}
                  >
                    <span className="text-base">{l.icon}</span>
                    <span className="flex-1">
                      {l.tkey ? t(l.tkey) : l.label}
                    </span>
                    {!!l.badge && l.badge > 0 && (
                      <span className="rounded-full bg-indigo-500 px-1.5 text-xs font-semibold text-white">
                        {l.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {onSignOut && (
                <>
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    type="button"
                    style={{ ["--i" as string]: links.length }}
                    onClick={() => {
                      close();
                      onSignOut();
                    }}
                    className="menu-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:pl-4"
                  >
                    <PowerIcon className="h-[18px] w-[18px]" />
                    Chiqish
                  </button>
                </>
              )}

              {footer && (
                <>
                  <div className="my-1 h-px bg-white/10" />
                  <div className="px-1 pb-1 pt-1">{footer}</div>
                </>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
