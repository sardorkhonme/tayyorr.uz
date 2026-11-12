import { after } from "next/server";

import { currentUser } from "@/lib/session";
import { AnnouncementCarousel } from "@/components/announcement-banner";
import { GuideBanner } from "@/components/guide-banner";
import { getSmmAnnouncements } from "@/lib/announcement";
import { ServicesBoard } from "@/components/services-board";
import { SaleBanner } from "@/components/sale-banner";
import { db } from "@/lib/db";
import { loadCatalog } from "@/lib/catalog";
import { maybeSyncServices } from "@/lib/sync-services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Tayyorr SMM" };

const FAQ = [
  {
    q: "Buyurtma bajarilmasa nima böladi?",
    a: "Bekor bölsa — pul töliq, qisman bajarilsa — bajarilmagan qismi hamyoningizga avtomatik qaytadi.",
  },
  {
    q: "Qança vaqtda bajariladi?",
    a: "Köpçilik xizmatlar bir neça daqiqada boşlanadi. Holatini «Buyurtmalarim» bölimida kuzatasiz.",
  },
  {
    q: "Parol yoki akkauntimni berişim kerakmi?",
    a: "Yöq. Faqat oçiq sahifa, post yoki kanal havolasi kifoya — heç qaçon parolingizni söramaymiz.",
  },
];

export default async function SmmPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; k?: string }>;
}) {
  const { p, k } = await searchParams;

  if ((await db.smmService.count({ where: { active: true } })) === 0) await maybeSyncServices();
  else after(() => maybeSyncServices());

  const [user, services, announcements] = await Promise.all([currentUser(), loadCatalog(), getSmmAnnouncements()]);
  const sale = services.filter((s) => s.discount > 0);
  const maxSale = sale.reduce((m, s) => Math.max(m, s.discount), 0);

  return (
    <div className="space-y-8">
      {/* tepada e'lon banneri; qöllanma — headerdagi ikonkada (öqilmagan bölsa — ogohlantiriş banneri) */}
      {announcements.length > 0 && <AnnouncementCarousel items={announcements} />}

      <GuideBanner hideWhenRead />

      {sale.length > 0 && <SaleBanner count={sale.length} max={maxSale} />}

      <ServicesBoard
        services={services}
        loggedIn={!!user}
        balance={user?.balance ?? 0}
        initialPlatform={p ?? null}
        initialKind={k ?? null}
      />

      <section className="pt-8">
        <h2 className="font-display text-2xl font-bold text-zinc-900">Savollar</h2>
        <div className="card mt-6 divide-y divide-zinc-100 !rounded-3xl">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-zinc-900">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg text-zinc-500 transition group-open:rotate-45 group-open:bg-indigo-100 group-open:text-indigo-600">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-zinc-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
