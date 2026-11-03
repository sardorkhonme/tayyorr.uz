import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { describeDevice } from "@/lib/user-agent";

const TAKE = 200;

export default async function AdminUserVisits({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isSupport: true },
  });
  if (!user || user.isSupport) notFound();

  const [visits, total] = await Promise.all([
    db.siteVisit.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: TAKE,
    }),
    db.siteVisit.count({ where: { userId: id } }),
  ]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-1 font-semibold text-white">
        Kirişlar (saytga taşriflar){" "}
        <span className="text-sm font-normal text-zinc-500">({total})</span>
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Login qiliş emas — foydalanuvçi allaqaçon tizimga kirgan holda
        saytni har oçişi (yangi brauzer sessiyasi/tab) bitta qator. Bitta
        tab neça soat oçiq tursa ham faqat bir marta yoziladi.
        {total > TAKE ? ` Sönggi ${TAKE} tasi körsatilgan.` : ""}
      </p>
      {visits.length === 0 ? (
        <p className="text-sm text-zinc-500">Hali taşrif qayd etilmagan.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Sana</th>
                <th className="px-3 py-2">Qurilma</th>
                <th className="px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-300">
                    {shortDateTime(v.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {describeDevice(v.userAgent) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{v.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
