import Link from "next/link";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { describeDevice } from "@/lib/user-agent";
import {
  LandingPhoneSlideManager,
  type PhoneSlide,
} from "@/components/admin/landing-phone-slide-manager";

// mobil ilovada onboarding tugaganda REGISTER yozuvi shu belgi bilan yoziladi
const MOBILE_REGISTER = { action: "REGISTER", summary: { contains: "mobil ilova" } } as const;
const LIST_TAKE = 200;

export default async function AdminMobileApp({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [downloads, downloadsWeek, signups, signupsWeek, slideRows] = await Promise.all([
    db.appDownload.count(),
    db.appDownload.count({ where: { createdAt: { gte: weekAgo } } }),
    db.activityLog.count({ where: MOBILE_REGISTER }),
    db.activityLog.count({ where: { ...MOBILE_REGISTER, createdAt: { gte: weekAgo } } }),
    db.landingPhoneSlide.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
  ]);

  const downloadRows =
    view === "downloads"
      ? await db.appDownload.findMany({
          orderBy: { createdAt: "desc" },
          take: LIST_TAKE,
          include: { user: { select: { id: true, name: true, login: true } } },
        })
      : [];
  const signupRows =
    view === "signups"
      ? await db.activityLog.findMany({
          where: MOBILE_REGISTER,
          orderBy: { createdAt: "desc" },
          take: LIST_TAKE,
          include: { user: { select: { id: true, name: true, login: true, role: true } } },
        })
      : [];

  const slides: PhoneSlide[] = slideRows.map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    imageUrl: p.imageUrl,
    imageKey: p.imageKey ?? "",
    order: p.order,
    active: p.active,
  }));

  const stats = [
    { key: "downloads", label: "\"Ilovani yuklab olish\" bosildi", value: downloads, week: downloadsWeek, icon: "⬇️" },
    { key: "signups", label: "Ilovada ro'yxatdan o'tdi", value: signups, week: signupsWeek, icon: "📱" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold text-white">Mobil ilova</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Yuklab olish va ilovadagi ro&apos;yxatdan o&apos;tish statistikasi hamda
          landingdagi telefon skrinshotlari. Raqamni bossangiz — ro&apos;yxat ochiladi.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((s) => {
            const active = view === s.key;
            return (
              <Link
                key={s.key}
                href={active ? "/sardorxon/admin/app" : `/sardorxon/admin/app?view=${s.key}`}
                scroll={false}
                className={`rounded-2xl border p-5 transition ${
                  active
                    ? "border-indigo-400/60 bg-indigo-500/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span>
                    {s.icon} {s.label}
                  </span>
                  <span className="text-xs text-indigo-300">
                    {active ? "yopish ▲" : "ro'yxat ▼"}
                  </span>
                </div>
                <div className="mt-2 text-4xl font-semibold text-white">{s.value}</div>
                <div className="mt-1 text-xs text-zinc-500">oxirgi 7 kunda: {s.week}</div>
              </Link>
            );
          })}
        </div>

        {view === "downloads" && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Sana</th>
                  <th className="px-4 py-2">Qurilma</th>
                  <th className="px-4 py-2">IP</th>
                  <th className="px-4 py-2">Foydalanuvchi</th>
                </tr>
              </thead>
              <tbody>
                {downloadRows.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-300">{shortDateTime(d.createdAt)}</td>
                    <td className="px-4 py-2 text-zinc-400">{describeDevice(d.userAgent) ?? "—"}</td>
                    <td className="px-4 py-2 text-zinc-500">{d.ip ?? "—"}</td>
                    <td className="px-4 py-2">
                      {d.user ? (
                        <Link href={`/sardorxon/admin/users/${d.user.id}`} className="text-indigo-400 hover:underline">
                          {d.user.name ?? "—"} <span className="text-zinc-500">@{d.user.login ?? "—"}</span>
                        </Link>
                      ) : (
                        <span className="text-zinc-600">mehmon</span>
                      )}
                    </td>
                  </tr>
                ))}
                {downloadRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                      Hali hech kim bosmagan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === "signups" && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Sana</th>
                  <th className="px-4 py-2">Foydalanuvchi</th>
                  <th className="px-4 py-2">Rol</th>
                  <th className="px-4 py-2">Qurilma</th>
                </tr>
              </thead>
              <tbody>
                {signupRows.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-300">{shortDateTime(r.createdAt)}</td>
                    <td className="px-4 py-2">
                      <Link href={`/sardorxon/admin/users/${r.user.id}`} className="text-indigo-400 hover:underline">
                        {r.user.name ?? "—"} <span className="text-zinc-500">@{r.user.login ?? "—"}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-400">
                      {r.user.role === "PREPARER" ? "Tayyorlovchi" : r.user.role === "ORDERER" ? "Buyurtmachi" : "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{describeDevice(r.userAgent) ?? "—"}</td>
                  </tr>
                ))}
                {signupRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                      Hali hech kim ilovada ro&apos;yxatdan o&apos;tmagan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Telefon skrinshotlari va tavsiflari</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Landingda &quot;Ilovani yuklab olish&quot;dan oldingi bo&apos;limda scroll bilan almashadi.
        </p>
        <LandingPhoneSlideManager initial={slides} />
      </section>
    </div>
  );
}
