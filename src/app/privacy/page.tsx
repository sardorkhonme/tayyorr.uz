import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { PRIVACY, PRIVACY_INTRO, PRIVACY_UPDATED } from "@/lib/privacy";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description:
    "tayyorr.uz qaysi ma'lumotlarni to'playdi, ulardan qanday foydalanadi va qanday himoya qiladi.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <AuthShell width="max-w-2xl">
      <div className="card p-7">
        <h1 className="text-xl font-semibold text-white">Maxfiylik siyosati</h1>
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
            Foydalanish shartlari
          </Link>
          <Link href="/" className="btn-ghost">
            Bosh sahifa
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
