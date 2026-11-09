import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { restrictionApiError } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { sendTelegramToUser, siteUrl } from "@/lib/telegram-notify";
import { logToGroup, userLabel } from "@/lib/telegram-log";
import { getMinOfferStars, useStars } from "@/lib/stars";

const schema = z.object({
  price: z.number().int().positive(),
  message: z.string().max(1000).optional(),
  stars: z.number().int().min(1).max(100_000).optional(),
});

/**
 * Taklif (ariza) yuborish. Birinchi marta yuborilganda kamida
 * admin belgilagan minimal star sarflanadi (navbatdagi boshlang'ich o'rinni
 * belgilaydi) — [[stars.ts]]. Tayyorlovchi xohlasa boshidanoq ko'proq
 * star ko'rsatib yuqoriroq o'rinni tanlashi mumkin. Narx/xabarni keyin
 * bepul yangilash mumkin; yuqoriga chiqish uchun esa alohida "boost"
 * orqali qo'shimcha star kerak.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  if (session.user.role !== "PREPARER") {
    return NextResponse.json(
      { error: "Faqat tayyorlovçilar taklif yubora oladi" },
      { status: 403 },
    );
  }
  const restricted = await restrictionApiError(session.user.id);
  if (restricted) return restricted;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Narxni töğri kiriting" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order || order.status !== "OPEN") {
    return NextResponse.json(
      { error: "Buyurtma takliflar uçun oçiq emas" },
      { status: 400 },
    );
  }

  const existing = await db.offer.findUnique({
    where: { orderId_preparerId: { orderId: id, preparerId: session.user.id } },
  });

  // birinchi marta yuborilyapti — star sarflanadi (kamida minimal,
  // xohlasa boshidanoq ko'proq ko'rsatib yuqoriroq o'rin tanlaydi)
  // minimal star — admin panelda belgilanadi
  const minStars = await getMinOfferStars();
  if (!existing && parsed.data.stars !== undefined && parsed.data.stars < minStars) {
    return NextResponse.json({ error: `Ariza uçun kamida ${minStars} ⭐ kerak` }, { status: 400 });
  }
  const initialStars = Math.max(minStars, parsed.data.stars ?? minStars);
  if (!existing) {
    const spend = await useStars({ userId: session.user.id, stars: initialStars });
    if (!spend.ok) {
      return NextResponse.json({ error: spend.error }, { status: 400 });
    }
  }

  const offer = await db.offer.upsert({
    where: { orderId_preparerId: { orderId: id, preparerId: session.user.id } },
    update: { price: parsed.data.price, message: parsed.data.message, status: "PENDING" },
    create: {
      orderId: id,
      preparerId: session.user.id,
      price: parsed.data.price,
      message: parsed.data.message,
      starsSpent: initialStars,
    },
  });

  await logActivity(
    session.user.id,
    existing ? "OFFER_UPDATE" : "OFFER_CREATE",
    `Taklif ${existing ? "yangiladi" : "yubordi"}: «${order.title}» — ${parsed.data.price.toLocaleString("ru-RU")} söm`,
    { orderId: id, price: parsed.data.price },
  );

  const preparer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, firstName: true, lastName: true, login: true, email: true },
  });
  const preparerName =
    preparer?.firstName ||
    preparer?.name ||
    (preparer?.login ? `@${preparer.login}` : "Tayyorlovçi");

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
    existing ? "🙋 Taklif yangilandi" : "🙋 Yangi taklif",
    [
      `«${order.title}»`,
      `Tayyorlovçi: ${userLabel(preparer)}`,
      preparer?.email ? `Email: ${preparer.email}` : "",
      `Narx: ${parsed.data.price.toLocaleString("ru-RU")} söm`,
      parsed.data.message ? `Xabar: ${parsed.data.message}` : "",
      !existing
        ? `Ariza uçun sarflandi: ${initialStars} ⭐`
        : `Jami star: ${offer.starsSpent} ⭐`,
      `Buyurtma ID: ${id}`,
      `Taklif ID: ${offer.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return NextResponse.json({ offer }, { status: 201 });
}
