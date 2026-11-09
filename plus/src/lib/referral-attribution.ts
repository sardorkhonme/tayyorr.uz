import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { sendSupportNotice } from "@/lib/support";
import { adminUserUrl, notifyAdmins, userLabel } from "@/lib/telegram";

/**
 * Tashrif havolasi (/r/<kod>) orqali kelgan yangi akkauntni bog'lash —
 * cookie'larni app.tayyorr.uz dagi src/app/r/[code]/route.ts qo'yadi
 * (domen: .tayyorr.uz — shuning uchun tayyorr+ da ham o'qiladi).
 *  · tyr_ref  — admin yaratgan marketing havolasi kodi -> User.referralLinkId
 *  · tyr_uref — shaxsiy referal (taklif qilgan foydalanuvchi ID) -> User.referredById,
 *               taklif qilganga +1 star (app.tayyorr.uz onboarding bilan bir xil)
 * Faqat hali bog'lanmagan akkauntga bir marta qo'llanadi. Xato bo'lsa jim o'tadi.
 */
export async function applyReferralAttribution(userId: string) {
  try {
    const jar = await cookies();
    const refCode = jar.get("tyr_ref")?.value;
    const uRefId = jar.get("tyr_uref")?.value;
    if (!refCode && !uRefId) return;

    const me = await db.user.findUnique({
      where: { id: userId },
      select: { referralLinkId: true, referredById: true, login: true, firstName: true, lastName: true },
    });
    if (!me) return;

    const link =
      refCode && !me.referralLinkId
        ? await db.referralLink.findUnique({ where: { code: refCode.toUpperCase() }, select: { id: true, name: true } })
        : null;
    const referrer =
      uRefId && uRefId !== userId && !me.referredById
        ? await db.user.findUnique({
            where: { id: uRefId },
            select: { id: true, login: true, firstName: true, lastName: true, name: true, email: true },
          })
        : null;

    if (link || referrer) {
      // parallel so'rovda ikki marta bog'lanmasin — faqat bo'sh maydonni yozamiz
      const done = await db.user.updateMany({
        where: {
          id: userId,
          ...(link ? { referralLinkId: null } : {}),
          ...(referrer ? { referredById: null } : {}),
        },
        data: {
          ...(link ? { referralLinkId: link.id } : {}),
          ...(referrer ? { referredById: referrer.id } : {}),
        },
      });
      if (done.count === 0) return;
    }

    const who = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim();
    if (link) {
      await notifyAdmins(
        "registrations",
        "🔗 Tashrif havolasi orqali röyxatdan ötiş (tayyorr+)",
        [`Havola: ${link.name}`, `Yangi foydalanuvçi: @${me.login ?? "—"}${who ? ` (${who})` : ""}`],
        { text: "Foydalanuvçi", href: adminUserUrl(userId) },
      );
    }
    if (referrer) {
      await db.user.update({ where: { id: referrer.id }, data: { starBalance: { increment: 1 } } });
      await sendSupportNotice(
        referrer.id,
        `🌟 ${who || "Yangi foydalanuvçi"}${me.login ? ` (@${me.login})` : ""} siz yuborgan referal havola orqali röyxatdan ötdi va sizga 1 ⭐ taqdim etildi.`,
      ).catch(() => {});
      await notifyAdmins(
        "registrations",
        "🌟 Şaxsiy referal — +1 star (tayyorr+)",
        [`Taklif qilgan: ${userLabel(referrer)}`, `Yangi aʼzo: @${me.login ?? "—"}${who ? ` (${who})` : ""}`],
        { text: "Taklif qilgan", href: adminUserUrl(referrer.id) },
      );
    }

    // bir martalik — boshqa akkaunt ochilsa qayta bog'lanmasin
    for (const name of ["tyr_ref", "tyr_uref"]) {
      jar.set(name, "", { maxAge: 0, path: "/", domain: ".tayyorr.uz" });
    }
  } catch (e) {
    console.error("[plus] referral attribution", e);
  }
}
