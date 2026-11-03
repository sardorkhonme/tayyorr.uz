import type { Metadata } from "next";
import Link from "next/link";

import { SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: "Xizmatlar — prezentatsiya, kurs işi, referat va boşqalar",
  description:
    "tayyorr.uz orqali prezentatsiya, kurs işi, referat, mustaqil iş va diplom işini işonçli tayyorlovçilarga buyurtma qiling. Xavfsiz tölov va reyting tizimi.",
  alternates: { canonical: "/xizmatlar" },
};

const STEPS: [string, string][] = [
  ["Buyurtma qoldiring", "Iş turi, mavzu, hajm va muddatni yozing — bepul."],
  ["Takliflarni köring", "Tayyorlovçilar narx va namunalari bilan javob beradi."],
  ["Şartnoma tuzing", "Reyting va narxga qarab tanlang; summa hisobda bloklanadi."],
  ["Işni qabul qiling", "Tayyor işni körib, maʼqullaganda tölov ötadi."],
];

export default function ServicesHubPage() {
  return (
    <article className="prose-invert">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Boş sahifa
        </Link>{" "}
        / <span className="text-zinc-300">Xizmatlar</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Ilmiy va öquv işlari uçun xizmatlar
      </h1>
      <p className="mt-4 text-lg text-zinc-400">
        tayyorr.uz — talabalar va iş tayyorlovçilarni boğlovçi Özbek
        platformasi. Buyurtma qoldirasiz, bir neçta taklif olasiz va özingizga
        mos narx–sifat–muddatni tanlaysiz. Tölov iş qabul qilinmagunça xavfsiz
        saqlanadi.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {SERVICES.map((s) => (
          <Link
            key={s.slug}
            href={`/xizmatlar/${s.slug}`}
            className="card block transition hover:border-white/15 hover:bg-white/[0.06]"
          >
            <h2 className="font-semibold text-white">{s.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{s.tagline}</p>
            <span className="mt-3 inline-block text-sm text-indigo-400">
              Batafsil →
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-white">
        Qanday işlaydi
      </h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300">
              {i + 1}
            </span>
            <span>
              <b className="text-white">{t}.</b>{" "}
              <span className="text-zinc-400">{d}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-6 text-center">
        <p className="text-lg font-medium text-white">
          Işni bugun buyurtma qiling
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Röyxatdan ötiş va buyurtma qoldiriş bepul.
        </p>
        <Link href="/register" className="btn-white mt-4 inline-flex">
          Boşlaş
        </Link>
      </div>
    </article>
  );
}
