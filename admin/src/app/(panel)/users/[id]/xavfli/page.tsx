import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { AdminPostButton } from "@/components/admin/admin-post-button";

export default async function AdminUserDangerZone({
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

  return (
    <section className="rounded-xl border border-red-500/25 bg-red-500/5 p-5">
      <h2 className="mb-1 font-semibold text-red-300">Xavfli zona</h2>
      <p className="mb-3 text-sm text-zinc-400">
        Hisob va barça boğliq maʼlumotlar (buyurtmalar, xabarlar, suhbatlar,
        takliflar, hisob amallari) butunlay öçiriladi. Tayyorlovçi bölgan
        faol şartnomalardagi mablağ buyurtmaçiga qaytariladi.
      </p>
      <AdminPostButton
        url={`/api/admin/users/${user.id}`}
        method="DELETE"
        label="Hisobni butunlay öçiriş"
        className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/30"
        confirmText="Foydalanuvçi va uning BARÇA maʼlumotlari öçiriladi. Bu amalni ortga qaytarib bölmaydi. Davom etilsinmi?"
        redirectTo="/users"
      />
    </section>
  );
}
