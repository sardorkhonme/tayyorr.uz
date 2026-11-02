"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { signOutAction } from "@/app/(hub)/actions";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { TopupButton } from "@/components/topup-button";
import { som } from "@/lib/format";
import { HUB_NAV, isActive, MAIN_SITE_URL } from "@/lib/hub-nav";

export type HubUser = {
  name: string;
  image: string | null;
  balance: number;
  walletCode: string | null;
} | null;

function Avatar({ user, size = "h-10 w-10" }: { user: NonNullable<HubUser>; size?: string }) {
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.image} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700`}>
      {user.name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

function NavLinks({ user, onNavigate, mobile = false }: { user: HubUser; onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {HUB_NAV.filter((l) => (!l.auth || user) && (mobile || !l.mobileOnly)).map((l) => {
        const active = !l.external && isActive(pathname, l.href);
        const cls = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
          active ? "bg-gradient-to-r from-indigo-50 to-fuchsia-50 text-indigo-700" : "nav-item text-zinc-600"
        }`;
        const inner = (
          <>
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
                active ? "bg-white text-indigo-600 shadow-sm" : "bg-zinc-100/80 text-zinc-500"
              }`}
            >
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" className="h-6 w-6 object-contain" />
              ) : (
                <Icon name={l.icon} className="h-[18px] w-[18px]" />
              )}
            </span>
            <span className="flex-1">{l.label}</span>
          </>
        );
        return l.external ? (
          <a key={l.href} href={l.href} className={cls} onClick={onNavigate}>
            {inner}
          </a>
        ) : (
          <Link key={l.href} href={l.href} className={cls} onClick={onNavigate}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

function WalletCard({ user }: { user: NonNullable<HubUser> }) {
  return (
    <div className="shine rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white shadow-lg shadow-indigo-500/25">
      <Link href="/wallet" className="relative z-[2] block">
        <p className="flex items-center gap-1.5 text-xs text-indigo-100">
          <Icon name="wallet" className="h-4 w-4" /> Hamyon
        </p>
        <p className="mt-0.5 font-display text-2xl font-bold">{som(user.balance)}</p>
      </Link>
      {user.walletCode && <p className="mt-0.5 text-[11px] text-indigo-200">kod: {user.walletCode}</p>}
      <TopupButton className="mt-3 w-full rounded-xl bg-white/15 py-2 text-sm font-semibold transition hover:bg-white/25">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} /> To&apos;ldirish
        </span>
      </TopupButton>
    </div>
  );
}

function GuestCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-900">Hisobingizga kiring</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">tayyorr.uz hisobi shu yerda ham ishlaydi.</p>
      <div className="mt-3 flex flex-col gap-2">
        <Link href="/register" className="btn-primary !py-2.5 !text-sm">Ro&apos;yxatdan o&apos;tish</Link>
        <Link href="/login" className="btn-ghost !py-2.5 !text-sm">Kirish</Link>
      </div>
    </div>
  );
}

/** Menyuning eng pastidagi tayyorr.uz kartochkasi — to'q gradient, ajralib turadi. */
function MainSiteCard() {
  return (
    <a
      href={MAIN_SITE_URL}
      className="shine group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-indigo-950 to-indigo-700 p-3 text-white shadow-lg shadow-indigo-900/25 transition hover:shadow-indigo-700/40"
    >
      <span className="relative z-[2] grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="h-6 w-6 object-contain" />
      </span>
      <span className="relative z-[2] min-w-0 flex-1">
        <span className="block font-display text-sm font-bold leading-tight">
          Ilmiy ishlar
        </span>
        <span className="block truncate text-[11px] text-white/70">app.tayyorr.uz</span>
      </span>
      <Icon
        name="external"
        className="relative z-[2] h-4 w-4 opacity-80 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </a>
  );
}

function SignOut() {
  return (
    <form action={signOutAction}>
      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-red-600 transition hover:bg-red-50">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50">
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </span>
        Chiqish
      </button>
    </form>
  );
}

/** Kompyuterda chap tomonda doimiy panel (header o'rniga). */
export function HubSidebar({ user }: { user: HubUser }) {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-64 flex-col border-r border-zinc-200/80 bg-white lg:flex">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <Link href="/" className="px-1">
          <Logo className="text-2xl" />
        </Link>

        {user ? (
          <>
            <div className="flex items-center gap-3 px-1">
              <Avatar user={user} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-zinc-900">{user.name}</span>
                <span className="block text-xs text-zinc-500">tayyorr+ a&apos;zosi</span>
              </span>
            </div>
            <WalletCard user={user} />
          </>
        ) : (
          <GuestCard />
        )}

        <NavLinks user={user} />
      </div>
      <div className="space-y-2 border-t border-zinc-100 p-3">
        <MainSiteCard />
        {user && <SignOut />}
      </div>
    </aside>
  );
}

/** Telefonda: tepada ixcham panel, barcha bo'limlar popup menyuda. */
export function HubMobileBar({ user }: { user: HubUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-[60] flex h-16 items-center gap-2 border-b border-zinc-200/70 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/">
          <Logo className="text-2xl" />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <TopupButton className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1 text-sm font-semibold text-zinc-900 shadow-sm">
              {som(user.balance)}
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} />
              </span>
            </TopupButton>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm"
          >
            <span className="relative flex h-3.5 w-4 flex-col justify-between">
              <span className={`h-0.5 w-full rounded bg-current transition ${open ? "translate-y-[6px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full rounded bg-current transition ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-full rounded bg-current transition ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 top-16 z-50 lg:hidden">
            <div className="absolute inset-0 bg-zinc-900/25 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="animate-pop absolute right-3 top-2 max-h-[calc(100dvh-5.5rem)] w-[min(20rem,calc(100vw-1.5rem))] space-y-4 overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl">
              {user ? (
                <>
                  {/* balans tepadagi panelda turibdi — menyuda faqat profil */}
                  <div className="flex items-center gap-3 px-1">
                    <Avatar user={user} />
                    <span className="min-w-0 truncate font-semibold text-zinc-900">{user.name}</span>
                  </div>
                </>
              ) : (
                <GuestCard />
              )}
              <NavLinks user={user} mobile onNavigate={() => setOpen(false)} />
              <div className="space-y-2 border-t border-zinc-100 pt-3">
                <MainSiteCard />
                {user && <SignOut />}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
