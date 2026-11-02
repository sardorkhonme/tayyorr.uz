import { db } from "@/lib/db";
import { notifyAdmins, adminUserUrl } from "@/lib/telegram";

/** tayyorr.uz dagi src/lib/terms.ts bilan bir xil. */
export const TERMS_VERSION = "2026-09-04";

/** Yangi foydalanuvchi: faoliyat jurnali + admin guruhining "Ro'yxatdan o'tish" topigi. */
export async function logRegistration(
  user: { id: string; firstName: string | null; lastName?: string | null; email: string | null },
  how: "email" | "Google",
) {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  await db.activityLog
    .create({
      data: {
        userId: user.id,
        action: "REGISTER",
        summary: `Ro'yxatdan o'tdi — tayyorr+ orqali (${how})`,
      },
    })
    .catch(() => {});
  await notifyAdmins(
    "registrations",
    "🆕 Yangi ro'yxatdan o'tish (tayyorr+ orqali)",
    [
      "Manba: tayyorr+ (smm.tayyorr.uz)",
      `Usul: ${how === "Google" ? "Google" : "email + parol"}`,
      full ? `Ism: ${full}` : "",
      user.email ? `Email: ${user.email}` : "",
      `Foydalanuvchi ID: ${user.id}`,
    ],
    { text: "Foydalanuvchi", href: adminUserUrl(user.id) },
  );
}
