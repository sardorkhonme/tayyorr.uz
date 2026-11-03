import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
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

const schema = z.object({
  role: z.enum(["ORDERER", "PREPARER"]),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Oferta şartlariga rozilik bering" }),
  }),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  login: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Login faqat harf, raqam, _ va . dan iborat bölsin"),
  password: z.string().min(6).max(100),
  about: z.string().min(5).max(1000),
  // "YYYY-MM-DD" — ro'yxatdan o'tishda majburiy
  birthDate: birthDateSchema,
  avatarUrl: z.string().url(),
  hearAboutUs: z.enum(["instagram", "telegram", "ai", "google", "friend", "other"]),
  hearAboutUsDetail: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval Google bilan kiring" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Barça maydonlarni töldiring" },
      { status: 400 },
    );
  }

  const { login, password, firstName, lastName, acceptTerms, ...rest } =
    parsed.data;
  void acceptTerms;

  const userRecord = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userRecord) {
    return NextResponse.json(
      { error: "Bunday hisob mavjud emas. Qaytadan kiring yoki röyxatdan öting" },
      { status: 404 },
    );
  }

  const clash = await db.user.findFirst({
    where: { login, NOT: { id: session.user.id } },
  });
  if (clash) {
    return NextResponse.json({ error: "Bu login band" }, { status: 409 });
  }

  // tashrif havolasi orqali kelgan bo'lsa — akkauntga bog'laymiz
  const cookieStore = await cookies();
  const refCode = cookieStore.get("tyr_ref")?.value;
  const refLink = refCode
    ? await db.referralLink.findUnique({
        where: { code: refCode.toUpperCase() },
        select: { id: true, name: true },
      })
    : null;

  // shaxsiy (foydalanuvchidan-foydalanuvchiga) referal — o'zini o'zi
  // taklif qilishning oldini olamiz
  const fromSmm = cookieStore.get("tyr_src")?.value === "smm";
  const uRefId = cookieStore.get("tyr_uref")?.value;
  const referrer =
    uRefId && uRefId !== session.user.id
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

  await db.user.update({
    where: { id: session.user.id },
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
  });

  // taklif qilganga 1 star sovg'a — kafolatlangan xabar (support chat) +
  // shaxsiy Telegram bot ulangan bo'lsa qo'shimcha
  if (referrer) {
    await db.user.update({
      where: { id: referrer.id },
      data: { starBalance: { increment: 1 } },
    });

    const text = `🌟 ${firstName} ${lastName} (@${login}) siz yuborgan referal havola orqali röyxatdan ötdi va sizga 1 ⭐ taqdim etildi.`;
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
      buttonLabel: "Referallarni köriş",
    });

    await logToGroup(
      "referrals",
      "🌟 Şaxsiy referal — +1 star",
      [
        `Taklif qilgan: ${userLabel(referrer)}`,
        `Yangi aʼzo: @${login} (${firstName} ${lastName})`,
      ],
      siteUrl(`/sardorxon/admin/users/${referrer.id}`),
    );
  }

  await sendWelcome(session.user.id, firstName).catch(() => {});
  await logActivity(
    session.user.id,
    "REGISTER",
    `Röyxatdan ötdi — @${login} (${parsed.data.role === "PREPARER" ? "Tayyorlovçi" : "Buyurtma beruvçi"})${fromSmm ? " — tayyorr+ orqali" : ""}`,
  );
  await logToGroup(
    "registrations",
    fromSmm ? "🆕 Yangi röyxatdan ötiş (tayyorr+ orqali)" : "🆕 Yangi röyxatdan ötiş",
    [
      fromSmm ? "Manba: tayyorr+ (plus.tayyorr.uz)" : "",
      `Login: @${login}`,
      `Ism: ${firstName} ${lastName}`,
      session.user.email ? `Email: ${session.user.email}` : "",
      `Rol: ${parsed.data.role === "PREPARER" ? "Tayyorlovçi" : "Buyurtma beruvçi"}`,
      `Qayerdan: ${HEAR_ABOUT_US_LABELS[parsed.data.hearAboutUs] ?? parsed.data.hearAboutUs}${parsed.data.hearAboutUsDetail ? ` (${parsed.data.hearAboutUsDetail})` : ""}`,
      refLink ? `Referral havola: ${refLink.name}` : "",
      referrer ? `Şaxsiy referal: ${userLabel(referrer)}` : "",
      `Foydalanuvçi ID: ${session.user.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/users/${session.user.id}`),
  );
  if (refLink) {
    await logToGroup(
      "referrals",
      "🔗 Referral orqali röyxatdan ötiş",
      [`Havola: ${refLink.name}`, `Yangi foydalanuvçi: @${login}`],
      siteUrl(`/sardorxon/admin/referrals/${refLink.id}`),
    );
  }

  if (fromSmm) {
    const res = NextResponse.json({
      ok: true,
      redirect: process.env.SMM_SITE_URL || "https://plus.tayyorr.uz",
    });
    res.cookies.delete("tyr_src");
    return res;
  }
  return NextResponse.json({ ok: true });
}
