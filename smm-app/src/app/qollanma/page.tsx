import Link from "next/link";

import { MarkGuideRead } from "@/components/guide-banner";
import { Icon } from "@/components/icons";
import { PICKS, RULES, SECTIONS, TONE, type Term } from "@/lib/guide-data";
import { SupportLink } from "@/components/support-link";

export const metadata = { title: "Qöllanma — Tayyorr SMM" };

/**
 * Qo'llanma: provayder xizmat nomlaridagi inglizcha yozuvlar (No Refill, Non-Drop, Instant Start ...)
 * nimani anglatishi va qaysi xizmatni tanlash tavsiya etilishi. Ochilgan zahoti "o'qildi" deb belgilanadi
 * (buyurtma sahifasidagi katta banner endi chiqmaydi).
 */

function TermRow({ t }: { t: Term }) {
  const tone = TONE[t.tone];
  return (
    <div className="grid gap-2 py-3.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5">
      <div className="flex flex-wrap content-start gap-1.5">
        {t.names.map((n) => (
          <code key={n} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[12px] text-zinc-800">
            {n}
          </code>
        ))}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} title={tone.label} />
          {t.title}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{t.text}</p>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MarkGuideRead />

      <header className="animate-rise flex items-center gap-4">
        <span className="shine grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
          <Icon name="book" className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900">Qöllanma</h1>
          <p className="mt-1 text-zinc-500">1 daqiqada öqiladi</p>
        </div>
      </header>

      {/* eng asosiysi — yorliqqa qarash */}
      <section className="card !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900">Faqat şu yorliqqa qarang</h2>
        <p className="mt-1 text-sm text-zinc-500">Har bir xizmat kartasida bittasi turadi.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-emerald-700">♻️ 30 kun kafolat</span>
            <p className="mt-2.5 text-[15px] leading-relaxed text-emerald-900">
              Kamaysa — <b>qayta töldiriladi</b>. Obunaçi uçun şunisini oling.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-amber-700">⚠️ Kafolatsiz</span>
            <p className="mt-2.5 text-[15px] leading-relaxed text-amber-900">
              Arzon, lekin obunaçilar <b>tuşib ketişi mumkin</b> va qaytmaydi.
            </p>
          </div>
        </div>
      </section>

      {/* 3 qoida */}
      <section className="card !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900">3 ta qoida</h2>
        <ol className="mt-3 space-y-2.5">
          {RULES.map((r) => (
            <li key={r.text} className="flex items-start gap-3 text-[15px] leading-relaxed text-zinc-700">
              <span className="text-lg leading-6">{r.icon}</span>
              {r.text}
            </li>
          ))}
        </ol>
      </section>

      {/* nimani olish */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PICKS.map((p) => (
          <div key={p.kind} className="card min-w-0 !rounded-2xl p-4">
            <span className="flex items-center gap-2 font-semibold text-zinc-900">
              <Icon name={p.icon} className="h-4 w-4 shrink-0 text-indigo-500" />
              {p.kind}
            </span>
            <p className="mt-1 text-sm leading-snug text-zinc-600">{p.text}</p>
          </div>
        ))}
      </section>

      {/* muammo bo'lsa */}
      <section className="card !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900">Muammo bölsa</h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-zinc-700">
          <li>💸 Bajarilmasa yoki qisman bajarilsa — pul <b>avtomatik qaytadi</b>.</li>
          <li>♻️ Kafolatli xizmatda kamaysa — supportga buyurtma raqami bilan yozing.</li>
          <li>⏳ Uzoq boşlanmasa — buyurtma sahifasida «Yangilaş»ni bosing.</li>
        </ul>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/" className="btn-primary flex-1 !py-3.5">
            Xizmatlarni tanlaş
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <SupportLink className="btn-ghost flex-1 !py-3.5">
            <Icon name="headset" className="h-4 w-4" />
            Supportga yoziş
          </SupportLink>
        </div>
      </section>

      {/* batafsil — yopiq, xohlagan odam ochadi */}
      <section>
        <h2 className="font-display text-xl font-bold text-zinc-900">Atamalar luğati</h2>
        <p className="mt-1 text-sm text-zinc-500">Xizmat nomidagi inglizça yozuvlar — kerak bölsa oçib öqing.</p>
        <div className="card mt-4 divide-y divide-zinc-100 !rounded-3xl">
          {SECTIONS.map((s) => (
            <details key={s.id} id={s.id} className="group scroll-mt-24 px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon name={s.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-900">{s.title}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {s.terms.flatMap((t) => t.names[0]).join(", ")}
                  </span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg text-zinc-500 transition group-open:rotate-45 group-open:bg-indigo-100 group-open:text-indigo-600">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{s.lead}</p>
              <div className="divide-y divide-zinc-100">
                {s.terms.map((t) => (
                  <TermRow key={t.title} t={t} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
