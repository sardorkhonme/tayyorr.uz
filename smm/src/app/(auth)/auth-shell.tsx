import Link from "next/link";

import { Logo } from "@/components/logo";
import { MAIN_URL } from "@/lib/format";

const POINTS = [
  "Obunachi, layk va ko'rishlar — bir necha daqiqada",
  "Bajarilmasa — pul hamyonga avtomatik qaytadi",
  "Parolingiz hech qachon so'ralmaydi",
  "tayyorr.uz bilan bitta hisob va bitta hamyon",
];

/** Kirish / ro'yxatdan o'tish sahifalari uchun umumiy ramka (yorliqlar bilan). */
export function AuthShell({ mode, children }: { mode: "login" | "register"; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* chap — brend paneli (kompyuterda) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex lg:flex-col">
        <Link href="/" className="font-display text-2xl font-bold">
          tayyorr<span className="text-amber-300">+</span>
        </Link>
        <div className="my-auto max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">Sahifangizni bugunoq o&apos;stirishni boshlang</h2>
          <ul className="mt-10 space-y-4 text-lg text-indigo-50">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/20 text-sm">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-100/80">tayyorr.uz oilasi</p>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </aside>

      {/* o'ng — forma */}
      <section className="hero-bg relative flex flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="animate-rise w-full max-w-md">
          <Link href="/" className="mb-8 flex justify-center lg:hidden">
            <Logo className="text-3xl" />
          </Link>

          <div className="card !rounded-3xl p-6 sm:p-8">
            <div className="mb-7 grid grid-cols-2 rounded-2xl bg-zinc-100 p-1 text-[15px] font-semibold">
              <Link
                href="/login"
                className={`rounded-xl py-2.5 text-center transition ${
                  mode === "login" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className={`rounded-xl py-2.5 text-center transition ${
                  mode === "register" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Ro&apos;yxatdan o&apos;tish
              </Link>
            </div>
            {children}
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
            Davom etib,{" "}
            <a href={`${MAIN_URL}/terms`} className="underline hover:text-zinc-800">
              foydalanish shartlari
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
