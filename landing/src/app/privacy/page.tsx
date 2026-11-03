import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { PRIVACY, PRIVACY_INTRO, PRIVACY_UPDATED } from "@/lib/privacy";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description:
    "tayyorr.uz qaysi maʼlumotlarni töplaydi, ulardan qanday foydalanadi va qanday himoya qiladi.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="card p-7">
        <h1 className="font-display text-3xl font-bold text-white">Maxfiylik siyosati</h1>
        <div className="mt-4 text-sm sm:text-[0.95rem]">
          <p className="text-zinc-400">{PRIVACY_INTRO}</p>
          <div className="mt-4 flex flex-col gap-4">
            {PRIVACY.map((s) => (
              <section key={s.title}>
                <h2 className="font-semibold text-white">{s.title}</h2>
                {s.body && <p className="mt-1 leading-relaxed text-zinc-300">{s.body}</p>}
                {s.points && (
                  <ul className="mt-1.5 flex flex-col gap-1 text-zinc-300">
                    {s.points.map((p, i) => (
                      <li key={i} className="flex gap-2 leading-relaxed">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <p className="mt-5 text-xs text-zinc-500">Yangilangan: {PRIVACY_UPDATED}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/terms" className="btn-ghost">
            Foydalaniş şartlari
          </Link>
          <Link href="/" className="btn-ghost">
            Boş sahifa
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
