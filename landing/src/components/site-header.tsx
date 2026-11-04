import Link from "next/link";

import { LiquidGlass } from "@/components/liquid-glass";
import { Logo } from "@/components/logo";
import { LOGIN_URL, START_URL } from "@/lib/links";

const NAV = [
  { href: "/#xizmatlar", label: "Xizmatlar" },
  { href: "/#qanday", label: "Qanday işlaydi" },
  { href: "/#ilova", label: "Ilova" },
  { href: "/#savollar", label: "Savollar" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <LiquidGlass as="nav" radius={18} bezel={30} scale={90} className="mx-auto flex max-w-6xl items-center justify-between rounded-[18px] px-4 py-2.5 sm:px-5">
        <Link href="/" aria-label="Tayyorr.uz">
          <Logo className="text-xl sm:text-2xl" markClassName="h-8 sm:h-9" />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-zinc-400 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="transition hover:text-white">
              {n.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <a href={LOGIN_URL} className="rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-300 transition hover:text-white">
            Kiriş
          </a>
          <a href={START_URL} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Boşlaş
          </a>
        </div>
      </LiquidGlass>
    </header>
  );
}
