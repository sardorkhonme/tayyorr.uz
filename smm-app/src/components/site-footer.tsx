import Link from "next/link";

import { PlatformIcon } from "@/components/platform-icon";

const MAIN_URL = (process.env.NEXT_PUBLIC_MAIN_URL || "https://tayyorr.uz").replace(/\/+$/, "");
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz").replace(/\/+$/, "");
const PLUS_URL = (process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz").replace(/\/+$/, "");
const SMM_URL = (process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz").replace(/\/+$/, "");

const COLS = [
  {
    title: "Bo'limlar",
    links: [
      { href: "/", label: "Xizmatlar" },
      { href: "/chegirmalar", label: "Chegirmalar" },
      { href: "/orders", label: "Buyurtmalarim" },
      { href: "/wallet", label: "Hamyon" },
      { href: "/account", label: "Akkaunt" },
    ],
  },
  {
    title: "Boshqa xizmatlar",
    links: [
      { href: PLUS_URL, label: "tayyorr+" },
      { href: `${APP_URL}/dashboard`, label: "Ilmiy ishlar" },
      { href: MAIN_URL, label: "Bosh sahifa" },
    ],
  },
  {
    title: "Huquqiy",
    links: [
      { href: `${MAIN_URL}/terms`, label: "Ommaviy oferta" },
      { href: `${MAIN_URL}/privacy`, label: "Maxfiylik siyosati" },
    ],
  },
];

const SOCIAL = [
  { href: "https://t.me/tayyorruz", label: "Telegram", platform: "telegram", bg: "linear-gradient(135deg,#37aee2,#1e96c8)" },
  { href: "https://instagram.com/tayyorr.uz", label: "Instagram", platform: "instagram", bg: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-zinc-200/80">
      <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/smm-mark.png" alt="" className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-bold tracking-tight text-zinc-900">
              Tayyorr <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">SMM</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">Obunachi, layk va ko&apos;rishlar — avtomatik. Bajarilmasa pul hamyonga qaytadi.</p>
          <div className="mt-4 flex gap-2">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm transition hover:-translate-y-0.5"
                style={{ background: s.bg }}
              >
                <PlatformIcon platform={s.platform} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h3 className="text-sm font-semibold text-zinc-900">{c.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-500">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link href={l.href} className="transition hover:text-indigo-600">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="transition hover:text-indigo-600">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-zinc-200/80 py-5 text-xs text-zinc-400">
        © {new Date().getFullYear()} Tayyorr.uz — barcha huquqlar himoyalangan.
      </p>
    </footer>
  );
}
