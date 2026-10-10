import Link from "next/link";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { shortDateTime } from "@/lib/date";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { cleanQuery, idPrefixWhere, userSearchWhere } from "@/lib/admin-search";
import { LiveSearch } from "@/components/admin/live-search";

const STATUS: Record<string, string> = {
  PENDING: "O'tkazilishi kutilmoqda",
  PAID: "Kartaga o'tkazildi",
  REJECTED: "Rad etildi (qaytarildi)",
  CANCELLED: "Bekor qilindi",
};

function groupCard(d: string) {
  return d.replace(/(.{4})/g, "$1 ").trim();
}

export default async function AdminPayouts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = cleanQuery((await searchParams).q);
  const rows = await db.payoutRequest.findMany({
    where: q
      ? { OR: [{ user: userSearchWhere(q) }, ...(idPrefixWhere(q) ? [idPrefixWhere(q)!] : [])] }
      : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 150,
    include: { user: { select: { id: true, login: true, name: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Kartaga yechib olish</h1>
      <p className="text-sm text-zinc-500">
        Mablag' foydalanuvchi hisobidan avtomatik yechilgan. Kartaga haqiqatan
        o'tkazgach «Kartaga o'tkazdim» ni bosing. «O'tkazib bo'lmadi» — mablag'
        foydalanuvchiga qaytadi.
      </p>
      <LiveSearch placeholder="Foydalanuvchi (ism, login, ID) yoki so'rov ID" />

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Sana</th>
              <th className="px-4 py-2">Foydalanuvchi</th>
              <th className="px-4 py-2">Karta</th>
              <th className="px-4 py-2">Egasi</th>
              <th className="px-4 py-2">Summa</th>
              <th className="px-4 py-2">Holat</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                  {shortDateTime(p.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/sardorxon/admin/users/${p.user.id}`}
                    className="text-indigo-400 hover:underline"
                  >
                    @{p.user.login ?? p.user.name ?? "—"}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-zinc-200">
                  {groupCard(p.card)}
                </td>
                <td className="px-4 py-2 text-zinc-400">{p.cardName ?? "—"}</td>
                <td className="px-4 py-2 font-medium text-white">
                  {formatSom(p.amount)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      p.status === "PAID"
                        ? "text-emerald-400"
                        : p.status === "PENDING"
                          ? "text-amber-400"
                          : "text-zinc-500"
                    }
                  >
                    {STATUS[p.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {p.status === "PENDING" && (
                    <div className="flex justify-end gap-2">
                      <AdminPostButton
                        url={`/api/admin/payouts/${p.id}`}
                        body={{ action: "PAID" }}
                        label="✅ Kartaga o'tkazdim"
                        className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/25"
                        confirmText="Pul kartaga haqiqatan o'tkazildimi?"
                      />
                      <AdminPostButton
                        url={`/api/admin/payouts/${p.id}`}
                        body={{ action: "REJECT" }}
                        label="O'tkazib bo'lmadi"
                        className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/25"
                        confirmText="O'tkazib bo'lmadi — mablag' foydalanuvchiga qaytarilsinmi?"
                      />
                    </div>
                  )}
                  {p.adminNote && (
                    <div className="mt-1 text-xs text-zinc-500">{p.adminNote}</div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  {q ? "Hech narsa topilmadi." : "So'rovlar yo'q."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
