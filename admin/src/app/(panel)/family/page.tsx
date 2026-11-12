import Link from "next/link";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { FamilyAdmins } from "@/components/admin/family-admins";
import { FamilyChat } from "@/components/admin/family-chat";
import { BrandProfileForm } from "@/components/admin/brand-profile-form";
import { FamilyHubForm } from "@/components/admin/family-hub-form";
import { SupportProfileForm } from "@/components/admin/support-profile-form";

export const dynamic = "force-dynamic";

const userSelect = { id: true, name: true, firstName: true, lastName: true, login: true, avatarUrl: true, image: true } as const;

type U = { name: string | null; firstName: string | null; lastName: string | null; login: string | null };
const nameOf = (u: U) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || (u.login ? `@${u.login}` : "Foydalanuvçi");

/**
 * «Tayyorr's Family» — ilovadagi guruh admin uchun chat ko'rinishida (faqat «Tayyorr Support» nomidan yoziladi;
 * o'chirilganlari ham ko'rinadi, fayllar doimiy). «Sozlamalar» — statistika, profillar, karta, guruh adminlari.
 */
export default async function AdminFamily({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab } = await searchParams;
  const settings = tab === "settings";

  const tabs = (
    <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm">
      {[
        { href: "/family", label: "Çat", on: !settings },
        { href: "/family?tab=settings", label: "Sozlamalar", on: settings },
      ].map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${t.on ? "bg-indigo-500/15 text-white" : "text-zinc-400 hover:text-white"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (!settings) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Tayyorr’s Family</h1>
            <p className="mt-0.5 text-xs text-zinc-500">Siz guruhda faqat Tayyorr Support nomidan yozasiz. Öçirilgan xabarlar ham şu yerda körinadi.</p>
          </div>
          {tabs}
        </div>
        <FamilyChat />
      </div>
    );
  }

  const [members, total, today, admins] = await Promise.all([
    db.familyMember.count(),
    db.familyMessage.count(),
    db.familyMessage.count({ where: { sendAt: { gte: new Date(Date.now() - 24 * 3600 * 1000), lte: new Date() } } }),
    db.user.findMany({ where: { familyAdmin: true }, select: userSelect, orderBy: { login: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Tayyorr’s Family</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Faqat mobil ilovadagi guruh. Barça xabarlar saqlanadi — öçirilganlari ham, fayllar doimiy (ilovada fayl 5 kun oçiladi).</p>
        </div>
        {tabs}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Aʼzolar", value: members },
          { label: "Jami xabarlar", value: total },
          { label: "Söngi 24 soat", value: today },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="text-sm text-zinc-400">{s.label}</span>
            <p className="mt-1 text-2xl font-semibold text-white">{s.value.toLocaleString("ru-RU")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BrandProfileForm />
        <SupportProfileForm />
      </div>

      <FamilyHubForm />

      <FamilyAdmins admins={admins.map((a) => ({ id: a.id, name: nameOf(a), login: a.login, image: a.avatarUrl ?? a.image ?? null }))} />
    </div>
  );
}
