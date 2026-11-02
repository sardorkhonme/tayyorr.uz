import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { describeDevice } from "@/lib/user-agent";

export default async function AdminUserDevices({
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

  const logins = await db.activityLog.findMany({
    where: { userId: id, action: "AUTH_LOGIN" },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { userAgent: true, ip: true, createdAt: true },
  });

  const byDevice = new Map<
    string,
    { device: string; lastIp: string | null; firstSeen: Date; lastSeen: Date; count: number }
  >();
  for (const l of logins) {
    const device = describeDevice(l.userAgent) ?? "Noma'lum qurilma";
    const cur = byDevice.get(device);
    if (!cur) {
      byDevice.set(device, {
        device,
        lastIp: l.ip,
        firstSeen: l.createdAt,
        lastSeen: l.createdAt,
        count: 1,
      });
    } else {
      cur.count++;
      if (l.createdAt > cur.lastSeen) {
        cur.lastSeen = l.createdAt;
        cur.lastIp = l.ip;
      }
      if (l.createdAt < cur.firstSeen) cur.firstSeen = l.createdAt;
    }
  }
  const devices = [...byDevice.values()].sort(
    (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime(),
  );

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-1 font-semibold text-white">Qurilmalar</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Saytga kirish (login) tarixidan aniqlangan — bitta qurilmadan bir necha
        marta kirilgan bo'lsa, bitta qator sifatida ko'rsatiladi.
      </p>
      {devices.length === 0 ? (
        <p className="text-sm text-zinc-500">Hali kirish qayd etilmagan.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((d) => (
            <li
              key={d.device}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm"
            >
              <div>
                <div className="font-medium text-zinc-200">{d.device}</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Birinchi: {shortDateTime(d.firstSeen)} · Oxirgi:{" "}
                  {shortDateTime(d.lastSeen)}
                  {d.lastIp ? ` · ${d.lastIp}` : ""}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                {d.count} marta
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
