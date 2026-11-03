import Link from "next/link";

import { db } from "@/lib/db";
import { referralUrl } from "@/lib/referral";
import { shortDateTime } from "@/lib/date";
import { CreateReferralForm } from "@/components/admin/create-referral-form";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { AdminPostButton } from "@/components/admin/admin-post-button";

export const dynamic = "force-dynamic";

export default async function AdminReferrals() {
  const links = await db.referralLink.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Taşriflar</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Reklama/kanal uçun nomlangan havola yarating — neça kişi oçgani
          va ulardan qançasi röyxatdan ötgani şu yerda körinadi.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <CreateReferralForm />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Nomi</th>
              <th className="px-4 py-2">Havola</th>
              <th className="px-4 py-2">Yaratilgan</th>
              <th className="px-4 py-2">Taşriflar</th>
              <th className="px-4 py-2">Röyxatdan ötgan</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="px-4 py-2">
                  <Link
                    href={`/sardorxon/admin/referrals/${l.id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {l.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-400">
                      /r/{l.code}
                    </span>
                    <CopyLinkButton url={referralUrl(l.code)} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                  {shortDateTime(l.createdAt)}
                </td>
                <td className="px-4 py-2 font-medium text-white">
                  {l.visits}
                </td>
                <td className="px-4 py-2 text-emerald-400">
                  {l._count.users}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/sardorxon/admin/referrals/${l.id}`}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Oçiş
                    </Link>
                    <AdminPostButton
                      url={`/api/admin/referrals/${l.id}`}
                      method="DELETE"
                      label="Öçiriş"
                      className="text-xs text-red-400 hover:text-red-300"
                      confirmText="Havolani öçiriş — taşrif va röyxatdan ötganlar statistikasi yöqoladi (foydalanuvçilar özi öçmaydi). Davom etilsinmi?"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Hali havola yaratilmagan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
