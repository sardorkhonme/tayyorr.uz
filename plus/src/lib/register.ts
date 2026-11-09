import { db } from "@/lib/db";
import { HEAR_ABOUT_US } from "@/lib/hear-about-us";
import { adminUserUrl, notifyAdmins } from "@/lib/telegram";

/** tayyorr.uz dagi src/lib/terms.ts bilan bir xil. */
export const TERMS_VERSION = "2026-09-04";

/** Ro'yxatdan o'tish yakunlandi: faoliyat jurnali + admin guruhining "Ro'yxatdan o'tish" topigi. */
export async function logRegistration(
  user: {
    id: string;
    login: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    hearAboutUs: string | null;
    hearAboutUsDetail: string | null;
  },
  how: "email" | "Google" | "email kod",
) {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  const source = HEAR_ABOUT_US.find((h) => h.value === user.hearAboutUs)?.label ?? user.hearAboutUs;
  await db.activityLog
    .create({
      data: {
        userId: user.id,
        action: "REGISTER",
        summary: `Röyxatdan ötdi — @${user.login} — tayyorr+ orqali (${how})`,
      },
    })
    .catch(() => {});
  await notifyAdmins(
    "registrations",
    "🆕 Yangi röyxatdan ötiş (tayyorr+ orqali)",
    [
      "Manba: tayyorr+ (plus.tayyorr.uz)",
      `Login: @${user.login}`,
      full ? `Ism: ${full}` : "",
      user.email ? `Email: ${user.email}` : "",
      `Usul: ${how === "Google" ? "Google" : how === "email kod" ? "email + tasdiqlaş kodi" : "email + parol"}`,
      "Rol: tanlanmagan (tayyorr.uz ga kirganda söraladi)",
      source ? `Qayerdan: ${source}${user.hearAboutUsDetail ? ` (${user.hearAboutUsDetail})` : ""}` : "",
      `Foydalanuvçi ID: ${user.id}`,
    ],
    { text: "Foydalanuvçi", href: adminUserUrl(user.id) },
  );
}
