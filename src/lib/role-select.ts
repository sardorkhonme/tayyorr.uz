import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

export type Role = "ORDERER" | "PREPARER";

/**
 * Profili to'liq, lekin roli yo'q hisob (masalan tayyorr+ da ro'yxatdan
 * o'tgan) tayyorr.uz ga birinchi kirganda faqat rol tanlaydi.
 * Rol bir marta o'rnatiladi — keyin o'zgartirilmaydi.
 */
export async function chooseRole(userId: string, role: Role, via: "sayt" | "mobil ilova") {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, login: true, firstName: true, lastName: true, name: true, email: true },
  });
  if (!u) return { error: "Hisob topilmadi", status: 404 } as const;
  if (!u.login) return { error: "Avval profilni töldiring", status: 400 } as const;
  if (u.role) return { ok: true } as const;

  const upd = await db.user.updateMany({ where: { id: userId, role: null }, data: { role } });
  if (upd.count !== 1) return { ok: true } as const;

  const label = role === "PREPARER" ? "Tayyorlovçi" : "Buyurtma beruvçi";
  await logActivity(userId, "PROFILE_UPDATE", `Rol tanlandi — ${label} (${via})`);
  await logToGroup(
    "registrations",
    "🎭 Rol tanlandi (tayyorr+ hisobi tayyorr.uz ga kirdi)",
    [`Foydalanuvçi: ${userLabel(u)}`, u.email ? `Email: ${u.email}` : "", `Rol: ${label}`, `Qayerdan: ${via}`].filter(Boolean),
    siteUrl(`/sardorxon/admin/users/${userId}`),
  );
  return { ok: true } as const;
}
