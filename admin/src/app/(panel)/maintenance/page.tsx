import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getMaintenance, MAINT_USER_SELECT } from "@/lib/maintenance";
import { MaintenanceForm } from "@/components/admin/maintenance-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Texnik işlar" };

export default async function MaintenancePage() {
  await requireAdmin();
  const m = await getMaintenance();
  const users = m.allow.length ? await db.user.findMany({ where: { id: { in: m.allow } }, select: MAINT_USER_SELECT }) : [];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Texnik işlar rejimi</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Yoqilganda Tayyorr.uz (app), tayyorr+ va Tayyorr SMM faqat ruxsat berilgan foydalanuvçilarga işlaydi. Landing (tayyorr.uz)
          oçiq qoladi, lekin kiriş, röyxatdan ötiş va boşqa platformaga ötişda «texnik işlar» xabari çiqadi. Admin panel doim işlaydi.
        </p>
      </div>
      <MaintenanceForm
        initial={{ on: m.on, message: m.message, since: m.since ?? null }}
        initialUsers={m.allow.map((id) => users.find((u) => u.id === id) ?? { id, name: null, firstName: null, lastName: null, login: null, avatarUrl: null, image: null })}
      />
    </div>
  );
}
