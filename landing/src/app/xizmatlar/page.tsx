import type { Metadata } from "next";
import Link from "next/link";

import { SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: "Xizmatlar — prezentatsiya, kurs ishi, referat va boshqalar",
  description:
    "tayyorr.uz orqali prezentatsiya, kurs ishi, referat, mustaqil ish va diplom ishini ishonchli tayyorlovchilarga buyurtma qiling. Xavfsiz to'lov va reyting tizimi.",
  alternates: { canonical: "/xizmatlar" },
};

const STEPS: [string, string][] = [
  ["Buyurtma qoldiring", "Ish turi, mavzu, hajm va muddatni yozing — bepul."],
  ["Takliflarni ko'ring", "Tayyorlovchilar narx va namunalari bilan javob beradi."],
  ["Shartnoma tuzing", "Reyting va narxga qarab tanlang; summa hisobda bloklanadi."],
  ["Ishni qabul qiling", "Tayyor ishni ko'rib, ma'qullaganda to'lov o'tadi."],
];

export default function ServicesHubPage() {
  return (
    <article className="prose-invert">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Bosh sahifa
        </Link>{" "}
        / <span className="text-zinc-300">Xizmatlar</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Ilmiy va o'quv ishlari uchun xizmatlar
      </h1>
      <p className="mt-4 text-lg text-zinc-400">
        tayyorr.uz — talabalar va ish tayyorlovchilarni bog'lovchi O'zbek
        platformasi. Buyurtma qoldirasiz, bir nechta taklif olasiz va o'zingizga
        mos narx–sifat–muddatni tanlaysiz. To'lov ish qabul qilinmaguncha xavfsiz
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
        Qanday ishlaydi
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
          Ishni bugun buyurtma qiling
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Ro'yxatdan o'tish va buyurtma qoldirish bepul.
        </p>
        <Link href="/register" className="btn-white mt-4 inline-flex">
          Boshlash
        </Link>
      </div>
    </article>
  );
}
