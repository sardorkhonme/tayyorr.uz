import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { shortDateTime } from "@/lib/date";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { BalanceAdjustForm } from "@/components/admin/balance-adjust-form";
import { StarIcon } from "@/components/icons";

const TYPE_LABEL: Record<string, string> = {
  TOPUP: "Töldiriş",
  SPEND: "Tölov",
  TRANSFER_IN: "Kirim",
  TRANSFER_OUT: "Çiqim",
  PAYOUT: "Yeçiş",
  REFUND: "Qaytariş",
  HOLD: "Bloklandi",
  RELEASE: "Iş haqi",
  COMMISSION: "Komissiya",
};

export default async function AdminUserWallet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      isSupport: true,
      balance: true,
      starBalance: true,
      walletTxns: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!user || user.isSupport) notFound();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 font-semibold text-white">Balans / Starni töğirlaş</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Joriy balans: {formatSom(user.balance)} · {user.starBalance} <StarIcon className="h-3 w-3" />. Sababi
          foydalanuvçiga körinadi.
        </p>
        <BalanceAdjustForm userId={user.id} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-white">Oxirgi hisob amallari</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Sana</th>
                <th className="px-4 py-2">Tur</th>
                <th className="px-4 py-2">Summa</th>
                <th className="px-4 py-2">Holat</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {user.walletTxns.map((t) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                    {shortDateTime(t.createdAt)}
                  </td>
                  <td className="px-4 py-2">{TYPE_LABEL[t.type] ?? t.type}</td>
                  <td
                    className={`px-4 py-2 ${
                      t.reversedAt ? "text-red-400 line-through" : "text-white"
                    }`}
                  >
                    {t.reversedAt ? "−" : ""}
                    {formatSom(t.amount)}
                  </td>
                  <td className="px-4 py-2">
                    {t.reversedAt ? (
                      <span className="text-red-400">bekor</span>
                    ) : (
                      <span className="text-zinc-400">{t.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/sardorxon/admin/payments/${t.id}`}
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        çek
                      </Link>
                      {!t.reversedAt && t.status === "SUCCESS" && (
                        <AdminPostButton
                          url={`/api/admin/payments/${t.id}/reverse`}
                          label="bekor qiliş"
                          className="text-xs text-amber-400 hover:text-amber-300"
                          confirmText="Amal bekor qilinsinmi?"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
