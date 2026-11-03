import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { restrictionApiError } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { useStars } from "@/lib/stars";

const schema = z.object({ stars: z.number().int().positive().max(1000) });

/** Tayyorlovchi o'z arizasini navbatda yuqoriga ko'tarish uchun qo'shimcha star sarflaydi. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const restricted = await restrictionApiError(session.user.id);
  if (restricted) return restricted;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Star sonini töğri kiriting" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order || order.status !== "OPEN") {
    return NextResponse.json({ error: "Buyurtma navbat uçun oçiq emas" }, { status: 400 });
  }

  const offer = await db.offer.findUnique({
    where: { orderId_preparerId: { orderId: id, preparerId: session.user.id } },
  });
  if (!offer) {
    return NextResponse.json(
      { error: "Avval taklif yuborişingiz kerak" },
      { status: 400 },
    );
  }

  const spend = await useStars({ userId: session.user.id, stars: parsed.data.stars });
  if (!spend.ok) {
    return NextResponse.json({ error: spend.error }, { status: 400 });
  }

  const updated = await db.offer.update({
    where: { id: offer.id },
    data: { starsSpent: { increment: parsed.data.stars } },
  });

  await logActivity(
    session.user.id,
    "OFFER_BOOST",
    `Navbatda yuqoriga çiqiş uçun ${parsed.data.stars} star sarfladi: «${order.title}»`,
    { orderId: id, offerId: offer.id, stars: parsed.data.stars },
  );

  const preparer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, firstName: true, lastName: true, login: true, email: true },
  });

  await logToGroup(
    "stars",
    "🚀 Navbatda yuqoriga çiqiş",
    [
      `«${order.title}»`,
      `Tayyorlovçi: ${userLabel(preparer)}`,
      `Sarflandi: ${parsed.data.stars} ⭐`,
      `Jami star: ${updated.starsSpent} ⭐`,
      `Buyurtma ID: ${id}`,
    ],
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return NextResponse.json({ offer: updated });
}
