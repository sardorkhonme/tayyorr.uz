import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { BanForm } from "@/components/admin/ban-form";
import { PartialRestrictionForm } from "@/components/admin/partial-restriction-form";
import { KIND_RULES, PLATFORM_NAME, kindKey } from "@/lib/smm-adjust";

export default async function AdminUserBan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isSupport: true, bannedUntil: true, banReason: true },
  });
  if (!user || user.isSupport) notFound();

  const banned = user.bannedUntil && user.bannedUntil.getTime() > Date.now();

  const [rows, services] = await Promise.all([
    db.userRestriction.findMany({ where: { userId: id, until: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
    db.smmService.findMany({ where: { active: true }, select: { id: true, name: true, platform: true, category: true }, orderBy: [{ platform: "asc" }, { name: "asc" }] }),
  ]);
  const LABEL: Record<string, string> = {
    smm: "Tayyorr SMM — butunlay",
    uz_orders: "Tayyorr.uz: buyurtma beriş",
    uz_offers: "Tayyorr.uz: taklif yuboriş",
    uz_chat: "Tayyorr.uz: şaxsiy xabar",
    payout: "Pul yeçib oliş",
    family: "Tayyorr’s Family: yoziş",
  };
  const svc = new Map(services.map((s) => [s.id, s.name]));
  const platformName = (p: string) => PLATFORM_NAME[p] ?? p;
  const kindLabel = (k: string) => KIND_RULES.find((r) => r.key === k)?.label ?? k;
  const targetLabel = (t: string | null) => {
    if (t?.startsWith("p:")) return `SMM: ${platformName(t.slice(2))} — butunlay`;
    if (t?.startsWith("g:")) {
      const [, p, k] = t.split(":");
      return `SMM: ${platformName(p)} → ${kindLabel(k)}`;
    }
    return `SMM xizmati: ${svc.get(t ?? "") ?? "öçirilgan xizmat"}`;
  };
  const svcList = services.map((s) => ({ id: s.id, name: s.name, platform: s.platform, kind: kindKey(s.category, s.name) }));
  const active = rows.map((r) => ({
    id: r.id,
    label: r.scope === "smm_service" ? targetLabel(r.target) : (LABEL[r.scope] ?? r.scope),
    until: shortDateTime(r.until),
    reason: r.reason,
    permanent: r.until.getTime() - Date.now() > 50 * 365 * 24 * 3600 * 1000,
  }));

  return (
    <div className="flex flex-col gap-5">
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-3 font-semibold text-white">Töliq çeklov (ban)</h2>
      {banned ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-amber-300">
            {shortDateTime(user.bannedUntil!)} gaça çeklangan.
            {user.banReason ? ` Sabab: ${user.banReason}` : ""}
          </p>
          <AdminPostButton
            url={`/api/admin/users/${user.id}/unban`}
            label="Çeklovni olib taşlaş"
            className="btn-primary w-fit"
          />
          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-xs text-zinc-500">Muddatni yangilaş:</p>
            <BanForm userId={user.id} />
          </div>
        </div>
      ) : (
        <BanForm userId={user.id} />
      )}
    </section>
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-semibold text-white">Qisman çeklov</h2>
      <p className="mb-4 mt-1 text-xs text-zinc-500">
        Butun hisob emas — faqat tanlangan imkoniyatlar yopiladi. Foydalanuvçi qolgan qismdan odatdagidek foydalanadi; yopilgan joyda sabab bilan xabar çiqadi.
      </p>
      <PartialRestrictionForm userId={user.id} services={svcList} active={active} />
    </section>
    </div>
  );
}
