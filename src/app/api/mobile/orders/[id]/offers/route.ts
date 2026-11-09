import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { sendTelegramToUser } from "@/lib/telegram-notify";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { getMinOfferStars, useStars } from "@/lib/stars";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  price: z.number().int().positive(),
  message: z.string().max(1000).optional(),
  stars: z.number().int().min(1).max(100_000).optional(),
});

/**
 * Taklif yuborish — web bilan bir xil mantiq: birinchi marta yuborilganda
 * kamida admin belgilagan minimal star sarflanadi, tayyorlovchi xohlasa boshidanoq
 * ko'proq ko'rsatib yuqoriroq o'rinni tanlashi mumkin.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const me = await db.user.findUnique({ where: { id: auth.userId }, select: { role: true } });
  if (!me) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (me.role !== "PREPARER") {
    return mobileJson({ error: "Faqat tayyorlovçilar taklif yubora oladi" }, { status: 403 });
  }

  const restriction = await getRestriction(auth.userId);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Narxni töğri kiriting" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order || order.status !== "OPEN") {
    return mobileJson({ error: "Buyurtma takliflar uçun oçiq emas" }, { status: 400 });
  }

  const existing = await db.offer.findUnique({
    where: { orderId_preparerId: { orderId: id, preparerId: auth.userId } },
  });

  // minimal star — admin panelda belgilanadi
  const minStars = await getMinOfferStars();
  if (!existing && parsed.data.stars !== undefined && parsed.data.stars < minStars) {
    return mobileJson({ error: `Ariza uçun kamida ${minStars} ⭐ kerak` }, { status: 400 });
  }
  const initialStars = Math.max(minStars, parsed.data.stars ?? minStars);
  if (!existing) {
    const spend = await useStars({ userId: auth.userId, stars: initialStars });
    if (!spend.ok) {
      return mobileJson({ error: spend.error }, { status: 400 });
    }
  }

  const offer = await db.offer.upsert({
    where: { orderId_preparerId: { orderId: id, preparerId: auth.userId } },
    update: { price: parsed.data.price, message: parsed.data.message, status: "PENDING" },
    create: {
      orderId: id,
      preparerId: auth.userId,
      price: parsed.data.price,
      message: parsed.data.message,
      starsSpent: initialStars,
    },
  });

  await logActivity(
    auth.userId,
    existing ? "OFFER_UPDATE" : "OFFER_CREATE",
    `Taklif ${existing ? "yangiladi" : "yubordi"}: «${order.title}» — ${parsed.data.price.toLocaleString("ru-RU")} söm (mobil ilova)`,
    { orderId: id, price: parsed.data.price },
  );

  const preparer = await db.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, firstName: true, lastName: true, login: true, email: true },
  });
  const preparerName =
    preparer?.firstName || preparer?.name || (preparer?.login ? `@${preparer.login}` : "Tayyorlovçi");

  if (!existing) {
    await sendTelegramToUser(order.ordererId, {
      title: "🙋 Yangi köngilli topildi",
      body:
        `«${order.title}» buyurtmangizga ${preparerName} taklif yubordi: ` +
        `${parsed.data.price.toLocaleString("ru-RU")} söm` +
        (parsed.data.message ? `\n\n«${parsed.data.message}»` : ""),
      url: siteUrl(`/orders/${id}`),
      buttonLabel: "Köngillilarni köriş",
    });
  }

  await logToGroup(
    "offers",
    existing ? "🙋 Taklif yangilandi (mobil)" : "🙋 Yangi taklif (mobil)",
    [
      `«${order.title}»`,
      `Tayyorlovçi: ${userLabel(preparer)}`,
      `Narx: ${parsed.data.price.toLocaleString("ru-RU")} söm`,
      parsed.data.message ? `Xabar: ${parsed.data.message}` : "",
      !existing ? `Ariza uçun sarflandi: ${initialStars} ⭐` : `Jami star: ${offer.starsSpent} ⭐`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return mobileJson({ offer: { id: offer.id } }, { status: existing ? 200 : 201 });
}
