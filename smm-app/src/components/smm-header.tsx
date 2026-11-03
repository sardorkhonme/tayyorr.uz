"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { som } from "@/lib/format";

export type HeaderUser = { name: string; image: string | null; balance: number } | null;

const PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

const LINKS: { href: string; label: string; icon: IconName; auth?: boolean }[] = [
  { href: "/", label: "Xizmatlar", icon: "grid" },
  { href: "/chegirmalar", label: "Chegirmalar", icon: "tag" },
  { href: "/orders", label: "Buyurtmalarim", icon: "package", auth: true },
  { href: "/wallet", label: "Hamyon", icon: "wallet", auth: true },
  { href: "/account", label: "Akkaunt", icon: "users", auth: true },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * smm.tayyorr.uz sarlavhasi: SMM'da tabbar yo'q — bo'limlar (xizmatlar, chegirmalar, buyurtmalar,
 * hamyon, akkaunt) shu yerda; telefonda hammasi yashirin menyuga yig'iladi.
 */
export function SmmHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((l) => !l.auth || user);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
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
        <nav className="ml-4 hidden items-center gap-1 text-sm font-medium md:flex">
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
              Kirish
            </a>
          )}
          <a
            href={PLUS_URL}
            title="tayyorr+ ga qaytish"
            className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-zinc-700 transition hover:border-indigo-200 md:flex"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/plus-mark.png" alt="" className="h-7 w-7 object-contain" />
            tayyorr+
          </a>
          {/* telefon: menyu tugmasi */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menyu"
            className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 md:hidden"
          >
            <Icon name={open ? "close" : "grid"} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* telefon: yashirin menyu */}
      {open && (
        <div className="animate-pop border-t border-zinc-100 bg-white px-4 pb-5 pt-3 md:hidden">
          {user && (
            <Link href="/wallet" className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
              <span className="flex items-center gap-2 text-sm text-indigo-100">
                <Icon name="wallet" className="h-4 w-4" /> Hamyon
              </span>
              <span className="font-display text-lg font-bold">{som(user.balance)}</span>
            </Link>
          )}
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium ${
                  isActive(pathname, l.href) ? "bg-indigo-50 text-indigo-700" : "text-zinc-700"
                }`}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-500">
                  <Icon name={l.icon} className="h-[18px] w-[18px]" />
                </span>
                {l.label}
              </Link>
            ))}
            <a href={PLUS_URL} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/plus-mark.png" alt="" className="h-8 w-8 object-contain" />
              tayyorr+ ga qaytish
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
