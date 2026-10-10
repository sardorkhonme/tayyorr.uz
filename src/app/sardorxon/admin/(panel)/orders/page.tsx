import Link from "next/link";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { shortDate } from "@/lib/date";
import { cleanQuery, idPrefixWhere, userSearchWhere } from "@/lib/admin-search";
import { LiveSearch } from "@/components/admin/live-search";

export const dynamic = "force-dynamic";

const TYPE: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs ishi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom ishi",
  OTHER: "Boshqa",
};
const STATUS: Record<string, string> = {
  OPEN: "Ochiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topshirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor",
};

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = cleanQuery((await searchParams).q);
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
      <LiveSearch placeholder="Sarlavha, buyurtmachi yoki tayyorlovchi (ism, login, ID)" />

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Sana</th>
              <th className="px-4 py-2">Sarlavha</th>
              <th className="px-4 py-2">Buyurtmachi</th>
              <th className="px-4 py-2">Tayyorlovchi</th>
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
                    href={`/sardorxon/admin/orders/${o.id}`}
                    className="text-indigo-400 hover:underline"
                  >
                    {o.title}
                  </Link>
                  <div className="text-xs text-zinc-600">{TYPE[o.type] ?? o.type}</div>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/sardorxon/admin/users/${o.orderer.id}`}
                    className="text-zinc-300 hover:underline"
                  >
                    @{o.orderer.login ?? o.orderer.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-400">
                  {o.preparer ? (
                    <Link
                      href={`/sardorxon/admin/users/${o.preparer.id}`}
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
                      🗑 O'chirilgan{" "}
                      {o.deletedByRole === "ADMIN" ? "(admin)" : "(buyurtmachi)"}
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
                      label="O'chirish"
                      className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/25"
                      promptReason="O'chirish sababini yozing (buyurtmachiga ko'rinadi):"
                    />
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  Hech narsa topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
