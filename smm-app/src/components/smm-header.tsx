"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Icon, type IconName } from "@/components/icons";
import { OPEN_SUPPORT_EVENT } from "@/components/support-widget";
import { som } from "@/lib/format";

export type HeaderUser = { name: string; image: string | null; balance: number } | null;

const PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

const LINKS: { href: string; label: string; icon: IconName; auth?: boolean }[] = [
  { href: "/", label: "Xizmatlar", icon: "grid" },
  { href: "/chegirmalar", label: "Çegirmalar", icon: "tag" },
  { href: "/qollanma", label: "Qöllanma", icon: "book" },
  { href: "/orders", label: "Buyurtmalarim", icon: "package", auth: true },
  { href: "/wallet", label: "Hamyon", icon: "wallet", auth: true },
  { href: "/account", label: "Akkaunt", icon: "users", auth: true },
];

type HeaderAction = { icon: IconName; label: string; href: string; support?: boolean };

const GUIDE: HeaderAction = { icon: "book", label: "Qöllanma", href: "/qollanma" };
const HELP: HeaderAction = { icon: "headset", label: "Yordam", href: "/support", support: true };

/** Sahifaga xos header ikonkalari (ilovadagidek): Xizmatlar — qöllanma, Akkaunt — qöllanma va yordam. */
function headerActions(pathname: string): HeaderAction[] {
  if (pathname === "/") return [GUIDE];
  if (pathname === "/account") return [GUIDE, HELP];
  return [];
}

/** Bir nečta ikonka — bitta kapsula ičida, orasida ingiçka ajratgiç; har biri 40×40 (menyu tugmasi bilan bir xil). */
function HeaderIconGroup({ items }: { items: HeaderAction[] }) {
  if (!items.length) return null;
  return (
    <div className="flex h-10 items-center rounded-full border border-zinc-200 bg-white shadow-sm">
      {items.map((it, i) => (
        <span key={it.href} className="flex items-center">
          {i > 0 && <span aria-hidden className="h-5 w-px bg-zinc-200" />}
          <Link
            href={it.href}
            title={it.label}
            aria-label={it.label}
            onClick={(e) => {
              if (!it.support) return;
              // kompyuterda — support popupi, telefonda — /support (vidjet özi hal qiladi)
              e.preventDefault();
              window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT));
            }}
            className={`grid h-10 place-items-center text-zinc-700 transition hover:text-indigo-600 ${
              items.length === 1 ? "w-10 rounded-full" : i === 0 ? "w-11 rounded-l-full pl-0.5" : i === items.length - 1 ? "w-11 rounded-r-full pr-0.5" : "w-10"
            }`}
          >
            <Icon name={it.icon} className="h-5 w-5" />
          </Link>
        </span>
      ))}
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * smm.tayyorr.uz sarlavhasi: SMM'da tabbar yo'q — bo'limlar (xizmatlar, chegirmalar, buyurtmalar,
 * hamyon, akkaunt) shu yerda; telefon va planshetda hammasi popup menyuga yig'iladi
 * (tayyorr+ dagidek).
 */
export function SmmHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((l) => !l.auth || user);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // planshetni burab kompyuter kengligiga o'tsa — menyu yopiladi
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smm-mark.png" alt="" className="h-9 w-9 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight text-zinc-900">
            Tayyorr <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">SMM</span>
          </span>
        </Link>

        {/* kompyuter: bo'limlar headerda */}
        <nav className="ml-4 hidden items-center gap-1 text-sm font-medium lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 transition ${
                isActive(pathname, l.href) ? "bg-indigo-50 text-indigo-700" : "nav-item text-zinc-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <HeaderIconGroup items={headerActions(pathname)} />
          {user ? (
            <Link
              href="/wallet"
              className="hidden items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 sm:inline-flex"
              title="Hamyon"
            >
              <Icon name="wallet" className="h-4 w-4" />
              {som(user.balance)}
            </Link>
          ) : (
            <a href="/login" className="btn-primary !px-4 !py-2 !text-sm">
              Kiriş
            </a>
          )}
          <a
            href={PLUS_URL}
            title="tayyorr+ ga qaytiş"
            className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-zinc-700 transition hover:border-indigo-200 lg:flex"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/plus-mark.png" alt="" className="h-7 w-7 object-contain" />
            tayyorr+
          </a>
          {/* telefon va planshet: menyu tugmasi */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm lg:hidden"
          >
            <span className="relative flex h-3.5 w-4 flex-col justify-between">
              <span className={`h-0.5 w-full rounded bg-current transition ${open ? "translate-y-[6px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full rounded bg-current transition ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-full rounded bg-current transition ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {/* telefon va planshet: popup menyu (fon xiralashadi, bosilsa yopiladi) */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 top-16 z-50 lg:hidden">
            <div className="absolute inset-0 bg-zinc-900/25 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="animate-pop absolute right-3 top-2 max-h-[calc(100dvh-5.5rem)] w-[min(20rem,calc(100vw-1.5rem))] space-y-3 overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl sm:right-6 sm:w-80">
              {/* mehmonga "Kiriş" headerning o'zida turibdi */}
              {user && (
                <Link
                  href="/wallet"
                  className="shine flex items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white shadow-lg shadow-indigo-500/25"
                >
                  <span className="relative z-[2] flex items-center gap-2 text-sm text-indigo-100">
                    <Icon name="wallet" className="h-4 w-4" /> Hamyon
                  </span>
                  <span className="relative z-[2] font-display text-lg font-bold">{som(user.balance)}</span>
                </Link>
              )}
              <nav className="flex flex-col gap-1">
                {links.map((l) => {
                  const active = isActive(pathname, l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                        active ? "bg-gradient-to-r from-indigo-50 to-fuchsia-50 text-indigo-700" : "nav-item text-zinc-600"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
                          active ? "bg-white text-indigo-600 shadow-sm" : "bg-zinc-100/80 text-zinc-500"
                        }`}
                      >
                        <Icon name={l.icon} className="h-[18px] w-[18px]" />
                      </span>
                      {l.label}
                    </Link>
                  );
                })}
              </nav>
              <a
                href={PLUS_URL}
                className="nav-item flex items-center gap-3 rounded-xl border-t border-zinc-100 px-3 pb-1 pt-3 text-[15px] font-medium text-zinc-600"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/plus-mark.png" alt="" className="h-8 w-8 object-contain" />
                tayyorr+ ga qaytiş
              </a>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
