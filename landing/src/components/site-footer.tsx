import Link from "next/link";

import { Logo } from "@/components/logo";
import { APP_URL, INSTAGRAM_URL, PLUS_URL, SMM_URL, TELEGRAM_URL } from "@/lib/links";

const COLS = [
  {
    title: "Xizmatlar",
    links: [
      { href: `${APP_URL}/dashboard`, label: "Ilmiy ishlar" },
      { href: SMM_URL, label: "Tayyorr SMM" },
      { href: PLUS_URL, label: "tayyorr+" },
      { href: "/xizmatlar", label: "Ish turlari" },
    ],
  },
  {
    title: "Kompaniya",
    links: [
      { href: "/#qanday", label: "Qanday ishlaydi" },
      { href: "/#ilova", label: "Mobil ilova" },
      { href: TELEGRAM_URL, label: "Telegram kanal" },
      { href: INSTAGRAM_URL, label: "Instagram" },
    ],
  },
  {
    title: "Huquqiy",
    links: [
      { href: "/terms", label: "Ommaviy oferta" },
      { href: "/privacy", label: "Maxfiylik siyosati" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
            Ilmiy ishlar, ijtimoiy tarmoqlar uchun SMM va boshqa xizmatlar — bitta hisob va bitta hamyon bilan.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h3 className="text-sm font-semibold text-white">{c.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-500">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link href={l.href} className="transition hover:text-zinc-200">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="transition hover:text-zinc-200">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <p className="mx-auto max-w-6xl px-6 py-6 text-xs text-zinc-600">
          © {new Date().getFullYear()} Tayyorr.uz — barcha huquqlar himoyalangan.
        </p>
      </div>
    </footer>
  );
}
