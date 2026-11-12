"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";
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

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * smm.tayyorr.uz sarlavhasi — faqat kompyuterda (≥1024px): bo'limlar headerda.
 * Telefon va planşetda — ilovadagidek suzuvçi header va pastki panel (components/mobile-shell.tsx).
 */
export function SmmHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => !l.auth || user);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smm-mark.png" alt="" className="h-9 w-9 object-contain" />
          <span className="whitespace-nowrap font-display text-xl font-bold tracking-tight text-zinc-900">
            Tayyorr <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">SMM</span>
          </span>
        </Link>

        <nav className="ml-4 flex items-center gap-1 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 transition ${
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
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
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
            className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-zinc-700 transition hover:border-indigo-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/plus-mark.png" alt="" className="h-7 w-7 object-contain" />
            tayyorr+
          </a>
        </div>
      </div>
    </header>
  );
}
