import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { ME_SELECT, serializeMe } from "@/lib/mobile-me";
import { sendWelcome } from "@/lib/support-actions";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { sendTelegramToUser } from "@/lib/telegram-notify";
import { getSupportUserId } from "@/lib/support";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";
import { TERMS_VERSION } from "@/lib/terms";
import { birthDateSchema } from "@/lib/birthday";
import { HEAR_ABOUT_US_LABELS } from "@/components/hear-about-us-select";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  role: z.enum(["ORDERER", "PREPARER"]),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Oferta shartlariga rozilik bering" }),
  }),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  login: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Login faqat harf, raqam, _ va . dan iborat bo'lsin"),
  password: z.string().min(6).max(100),
  about: z.string().min(5).max(1000),
  // "YYYY-MM-DD" — yangi ilova doim yuboradi; eski versiyalar ro'yxatdan
  // o'tolmay qolmasligi uchun bu yerda ixtiyoriy (saytda majburiy)
  birthDate: birthDateSchema.optional(),
  hearAboutUs: z
    .enum(["instagram", "telegram", "ai", "google", "friend", "other"])
    .optional(),
  hearAboutUsDetail: z.string().max(200).optional(),
});

/**
 * Google bilan kirgan, lekin hali rol/login/parolni tanlamagan mobil
 * foydalanuvchi uchun profilni tugallash — web'dagi /api/onboarding bilan
 * bir xil mantiq, faqat NextAuth sessiyasi o'rniga Bearer token orqali.
 */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson(
      { error: parsed.error.issues[0]?.message ?? "Barcha maydonlarni to'ldiring" },
      { status: 400 },
    );
  }

  const { login, password, firstName, lastName, acceptTerms, ...rest } =
    parsed.data;
  void acceptTerms;

  const clash = await db.user.findFirst({
    where: { login, NOT: { id: auth.userId } },
  });
  if (clash) {
    return mobileJson({ error: "Bu login band" }, { status: 409 });
  }

  const cookieStore = await cookies();
  const refCode = cookieStore.get("tyr_ref")?.value;
  const refLink = refCode
    ? await db.referralLink.findUnique({
        where: { code: refCode.toUpperCase() },
        select: { id: true, name: true },
      })
    : null;

  const uRefId = cookieStore.get("tyr_uref")?.value;
  const referrer =
    uRefId && uRefId !== auth.userId
      ? await db.user.findUnique({
          where: { id: uRefId },
          select: {
            id: true,
            login: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : null;

  const user = await db.user.update({
    where: { id: auth.userId },
    data: {
      login,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      passwordHash: await bcrypt.hash(password, 10),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      ...(refLink ? { referralLinkId: refLink.id } : {}),
      ...(referrer ? { referredById: referrer.id } : {}),
      ...rest,
    },
    select: ME_SELECT,
  });

  if (referrer) {
    await db.user.update({
      where: { id: referrer.id },
      data: { starBalance: { increment: 1 } },
    });

    const text = `🌟 ${firstName} ${lastName} (@${login}) siz yuborgan referal havola orqali ro'yxatdan o'tdi va sizga 1 ⭐ taqdim etildi.`;
    const supportId = await getSupportUserId();
    const conv = await getOrCreateConversation(supportId, referrer.id);
    const msg = await createMessage({
      conversationId: conv.id,
      senderId: supportId,
      body: text,
      system: false,
    });
    await deliverMessage(msg);
    await sendTelegramToUser(referrer.id, {
      title: "🌟 Referal orqali +1 star",
      body: text,
      url: siteUrl("/referral"),
      buttonLabel: "Referallarni ko'rish",
    });

    await logToGroup(
      "referrals",
      "🌟 Shaxsiy referal — +1 star",
      [
        `Taklif qilgan: ${userLabel(referrer)}`,
        `Yangi a'zo: @${login} (${firstName} ${lastName})`,
      ],
      siteUrl(`/sardorxon/admin/users/${referrer.id}`),
    );
  }

  await sendWelcome(auth.userId, firstName).catch(() => {});
  await logActivity(
    auth.userId,
    "REGISTER",
    `Ro'yxatdan o'tdi — @${login} (${parsed.data.role === "PREPARER" ? "Tayyorlovchi" : "Buyurtma beruvchi"}) — mobil ilova`,
  );
  await logToGroup(
    "registrations",
    "🆕 Yangi ro'yxatdan o'tish (mobil ilova, Google)",
    [
      `Login: @${login}`,
      `Ism: ${firstName} ${lastName}`,
      `Rol: ${parsed.data.role === "PREPARER" ? "Tayyorlovchi" : "Buyurtma beruvchi"}`,
      parsed.data.hearAboutUs
        ? `Qayerdan: ${HEAR_ABOUT_US_LABELS[parsed.data.hearAboutUs] ?? parsed.data.hearAboutUs}`
        : "",
      refLink ? `Referral havola: ${refLink.name}` : "",
      `Foydalanuvchi ID: ${auth.userId}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/users/${auth.userId}`),
  );
  if (refLink) {
    await logToGroup(
      "referrals",
      "🔗 Referral orqali ro'yxatdan o'tish",
      [`Havola: ${refLink.name}`, `Yangi foydalanuvchi: @${login}`],
      siteUrl(`/sardorxon/admin/referrals/${refLink.id}`),
    );
  }

  return mobileJson({ user: serializeMe(user) });
}
