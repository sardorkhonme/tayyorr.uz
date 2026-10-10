import Link from "next/link";

import { ForceDark } from "@/components/force-dark";
import { Logo } from "@/components/logo";
import { SERVICES } from "@/lib/services";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen bg-[#07070c] text-zinc-100 antialiased">
      <ForceDark />

      <header className="relative z-20">
        <nav className="mx-auto mt-4 flex max-w-5xl items-center justify-between rounded-2xl glass px-5 py-3">
          <Link href="/" aria-label="tayyorr.uz">
            <Logo className="h-6" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 transition hover:text-white"
            >
              Kirish
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Buyurtma berish
            </Link>
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-14">{children}</div>

      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-zinc-500">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/xizmatlar" className="transition hover:text-zinc-300">
              Barcha xizmatlar
            </Link>
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/xizmatlar/${s.slug}`}
                className="transition hover:text-zinc-300"
              >
                {s.title.replace(" (bitiruv malakaviy) ishi tayyorlashda yordam", " ishi")}
              </Link>
            ))}
            <Link href="/terms" className="transition hover:text-zinc-300">
              Ommaviy oferta
            </Link>
            <Link href="/privacy" className="transition hover:text-zinc-300">
              Maxfiylik siyosati
            </Link>
          </div>
          <p className="mt-6">
            tayyorr<span className="text-indigo-400">.uz</span> ·{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  );
}
