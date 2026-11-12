import Link from "next/link";

import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { MAIN_URL } from "@/lib/format";

const POINTS = [
  "Barça xizmatlar uçun bitta hisob va bitta hamyon",
  "Tayyorr SMM — obunaçi, layk va körişlar",
  "Bajarilmagan xizmat uçun pul avtomatik qaytadi",
  "Yangi xizmatlar doimiy qöşib boriladi",
];

/** Kirish / ro'yxatdan o'tish sahifalari uchun umumiy ramka (yorliqlar bilan). */
export function AuthShell({ mode, children }: { mode: "login" | "register" | "none"; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh">
      {/* chap — brend paneli (kompyuterda): ekranga qotib turadi, aylanmaydi */}
      <aside className="fixed inset-y-0 left-0 hidden w-[46%] flex-col overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex">
        <Link href="/">
          <Logo className="text-2xl" light />
        </Link>
        <div className="my-auto max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">Bitta hisob — köp xizmat</h2>
          <ul className="mt-10 space-y-4 text-lg text-indigo-50">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-100/80">Tayyorr oilasi</p>
      </aside>

      {/* o'ng — forma (faqat shu qism aylanadi) */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-10 sm:px-8 lg:ml-[46%]">
        <div className="animate-rise w-full max-w-md">
          <Link href="/" className="mb-8 flex justify-center lg:hidden">
            <Logo className="text-3xl" />
          </Link>

          <div className="card !rounded-3xl p-6 sm:p-8">
            {mode !== "none" && (
            <div className="mb-7 grid grid-cols-2 rounded-2xl bg-zinc-100 p-1 text-[15px] font-semibold">
              <Link
                href="/login"
                className={`rounded-xl py-2.5 text-center transition ${
                  mode === "login" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Kiriş
              </Link>
              <Link
                href="/register"
                className={`rounded-xl py-2.5 text-center transition ${
                  mode === "register" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Röyxatdan ötiş
              </Link>
            </div>
            )}
            {children}
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
            Davom etib,{" "}
            <a href={`${MAIN_URL}/terms`} className="underline hover:text-zinc-800">
              foydalaniş şartlari
            </a>{" "}
            va{" "}
            <a href={`${MAIN_URL}/privacy`} className="underline hover:text-zinc-800">
              maxfiylik siyosati
            </a>
            ga rozilik bildirasiz.
          </p>
        </div>
      </section>
    </main>
  );
}
