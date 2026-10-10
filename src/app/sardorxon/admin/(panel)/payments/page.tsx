import Link from "next/link";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { shortDateTime } from "@/lib/date";
import { cleanQuery, idPrefixWhere, userSearchWhere } from "@/lib/admin-search";
import { LiveSearch } from "@/components/admin/live-search";

const TYPE_LABEL: Record<string, string> = {
  TOPUP: "To'ldirish",
  SPEND: "To'lov",
  TRANSFER_IN: "Kirim",
  TRANSFER_OUT: "Chiqim",
  PAYOUT: "Yechish",
  REFUND: "Qaytarish",
  HOLD: "Bloklandi",
  RELEASE: "Ish haqi",
  COMMISSION: "Komissiya",
};

export default async function AdminPayments({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = cleanQuery((await searchParams).q);
  const txns = await db.walletTransaction.findMany({
    where: q
      ? { OR: [{ user: userSearchWhere(q) }, ...(idPrefixWhere(q) ? [idPrefixWhere(q)!] : [])] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { id: true, login: true, name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">To'lovlar / hisob amallari</h1>
      <LiveSearch placeholder="Foydalanuvchi (ism, login, ID) yoki chekdagi Amal ID" />

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Sana</th>
              <th className="px-4 py-2">Foydalanuvchi</th>
              <th className="px-4 py-2">Tur</th>
              <th className="px-4 py-2">Summa</th>
              <th className="px-4 py-2">Usul</th>
              <th className="px-4 py-2">Holat</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-t border-white/5">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                  {shortDateTime(t.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/sardorxon/admin/users/${t.user.id}`}
                    className="text-indigo-400 hover:underline"
                  >
                    @{t.user.login ?? t.user.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-2">{TYPE_LABEL[t.type] ?? t.type}</td>
                <td
                  className={`px-4 py-2 font-medium ${
                    t.reversedAt ? "text-red-400 line-through" : "text-white"
                  }`}
                >
                  {t.reversedAt ? "−" : ""}
                  {formatSom(t.amount)}
                </td>
                <td className="px-4 py-2 text-zinc-400">{t.method}</td>
                <td className="px-4 py-2">
                  {t.reversedAt ? (
                    <span className="text-red-400">bekor qilingan</span>
                  ) : (
                    <span
                      className={
                        t.status === "SUCCESS"
                          ? "text-emerald-400"
                          : t.status === "PENDING"
                            ? "text-zinc-400"
                            : "text-red-400"
                      }
                    >
                      {t.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/sardorxon/admin/payments/${t.id}`}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    chek →
                  </Link>
                </td>
              </tr>
            ))}
            {txns.length === 0 && (
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
