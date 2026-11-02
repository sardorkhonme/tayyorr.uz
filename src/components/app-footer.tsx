"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { InstagramIcon, TelegramIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { LANDING_URL, PLUS_URL, SMM_URL } from "@/lib/site";

const TELEGRAM_URL = "https://t.me/tayyorruz";
const INSTAGRAM_URL = "https://instagram.com/tayyorr.uz";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Bo'limlar",
    links: [
      { href: "/dashboard", label: "Asosiy menyu" },
      { href: "/messages", label: "Xabarlar" },
      { href: "/wallet", label: "Hamyon" },
      { href: "/profile", label: "Profil" },
    ],
  },
  {
    title: "Boshqa xizmatlar",
    links: [
      { href: PLUS_URL, label: "tayyorr+" },
      { href: SMM_URL, label: "Tayyorr SMM" },
      { href: LANDING_URL, label: "Bosh sahifa" },
    ],
  },
  {
    title: "Huquqiy",
    links: [
      { href: "/terms", label: "Ommaviy oferta" },
      { href: "/privacy", label: "Maxfiylik siyosati" },
      { href: TELEGRAM_URL, label: "Yordam" },
    ],
  },
];

/** Ilmiy ishlar kabineti footeri (chat sahifalarida ko'rinmaydi — ular to'liq ekran). */
export function AppFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/messages")) return null;

  return (
    <footer className="relative z-10 mt-12 border-t border-white/10 px-3 sm:px-5 lg:pl-[17rem] lg:pr-6">
      <div className="mx-auto grid w-full max-w-5xl gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="text-xl" markClassName="h-8" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
            Ilmiy ishlar uchun ishonchli tayyorlovchilar — buyurtma bering yoki o&apos;zingiz tayyorlab daromad qiling.
          </p>
          <div className="mt-4 flex gap-2">
            {[
              { href: TELEGRAM_URL, label: "Telegram", icon: <TelegramIcon className="h-4 w-4" /> },
              { href: INSTAGRAM_URL, label: "Instagram", icon: <InstagramIcon className="h-4 w-4" /> },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h3 className="text-sm font-semibold text-zinc-200">{c.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-500">
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
      <p className="mx-auto w-full max-w-5xl border-t border-white/10 py-5 text-xs text-zinc-600">
        © {new Date().getFullYear()} Tayyorr.uz — barcha huquqlar himoyalangan.
      </p>
    </footer>
  );
}
