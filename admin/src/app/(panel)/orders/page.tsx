import Link from "next/link";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { shortDate } from "@/lib/date";
import { cleanQuery, idPrefixWhere, userSearchWhere } from "@/lib/admin-search";
import { LiveSearch } from "@/components/admin/live-search";
import { Icon } from "@/components/icons";
import { OfferStarsForm } from "@/components/admin/offer-stars-form";
import { getMinOfferStars } from "@/lib/offer-settings";

export const dynamic = "force-dynamic";

const TYPE: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs işi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom işi",
  OTHER: "Boşqa",
};
const STATUS: Record<string, string> = {
  OPEN: "Oçiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topşirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor",
};

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = cleanQuery((await searchParams).q);
  // admin qarorini kutayotgan nizolar va javob kutilayotgan bekor qilish so'rovlari
  const disputes = await db.contract.findMany({
    where: {
      status: "ACCEPTED",
      cancelState: { not: null },
      order: { status: { in: ["IN_PROGRESS", "DELIVERED"] } },
    },
    orderBy: { cancelRequestedAt: "asc" },
    include: { order: { select: { id: true, title: true } } },
  });
  const orders = await db.order.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { orderer: userSearchWhere(q) },
            { preparer: userSearchWhere(q) },
            ...(idPrefixWhere(q) ? [idPrefixWhere(q)!] : []),
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      orderer: { select: { id: true, login: true, name: true } },
      preparer: { select: { id: true, login: true, name: true } },
      _count: { select: { offers: true, contracts: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Buyurtmalar</h1>
      <OfferStarsForm value={await getMinOfferStars()} />
      <LiveSearch placeholder="Sarlavha, buyurtmaçi yoki tayyorlovçi (ism, login, ID)" />

      {disputes.length > 0 && (
        <div className="flex flex-col gap-2">
          {disputes.map((d) => (
            <Link
              key={d.id}
              href={`/orders/${d.order.id}`}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                d.cancelState === "DISPUTED"
                  ? "border-red-400/40 bg-red-500/10"
                  : "border-amber-400/30 bg-amber-500/5"
              }`}
            >
              <span className="text-white">
                {d.cancelState === "DISPUTED" ? (
                  <>
                    <Icon name="scale" className="mr-1 inline-block h-4 w-4 align-[-3px] text-red-300" />
                    Nizo — qaror kerak
                  </>
                ) : (
                  <>
                    <Icon name="alert" className="mr-1 inline-block h-4 w-4 align-[-3px] text-amber-300" />
                    Bekor qiliş söralgan
                  </>
                )}
                {" · "}
                {d.order.title}
              </span>
              <span className="text-xs text-zinc-400">
                {formatSom(d.amount)}
                {d.cancelRequestedAt && ` · ${shortDate(d.cancelRequestedAt)}`}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Sana</th>
              <th className="px-4 py-2">Sarlavha</th>
              <th className="px-4 py-2">Buyurtmaçi</th>
              <th className="px-4 py-2">Tayyorlovçi</th>
              <th className="px-4 py-2">Byudjet</th>
              <th className="px-4 py-2">Holat</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className={`border-t border-white/5 ${
                  o.deletedAt ? "opacity-50" : ""
                }`}
              >
                <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                  {shortDate(o.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-indigo-400 hover:underline"
                  >
                    {o.title}
                  </Link>
                  <div className="text-xs text-zinc-600">{TYPE[o.type] ?? o.type}</div>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/users/${o.orderer.id}`}
                    className="text-zinc-300 hover:underline"
                  >
                    @{o.orderer.login ?? o.orderer.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-400">
                  {o.preparer ? (
                    <Link
                      href={`/users/${o.preparer.id}`}
                      className="hover:underline"
                    >
                      @{o.preparer.login ?? o.preparer.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-white">
                  {o.budget ? formatSom(o.budget) : "—"}
                </td>
                <td className="px-4 py-2 text-zinc-300">
                  {o.deletedAt ? (
                    <span
                      className="text-red-300"
                      title={o.deleteReason ?? undefined}
                    >
                      <Icon name="trash" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />
                      Öçirilgan{" "}
                      {o.deletedByRole === "ADMIN" ? "(admin)" : "(buyurtmaçi)"}
                    </span>
                  ) : (
                    (STATUS[o.status] ?? o.status)
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {!o.deletedAt && (
                    <AdminPostButton
                      url={`/api/admin/orders/${o.id}`}
                      method="DELETE"
                      label="Öçiriş"
                      className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/25"
                      promptReason="Öçiriş sababini yozing (buyurtmaçiga körinadi):"
                    />
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  Heç narsa topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
