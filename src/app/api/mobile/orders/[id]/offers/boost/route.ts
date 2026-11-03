import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { useStars } from "@/lib/stars";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ stars: z.number().int().positive().max(1000) });

/** Tayyorlovchi navbatda yuqoriga chiqish uchun qo'shimcha star sarflaydi — web bilan bir xil mantiq. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const restriction = await getRestriction(auth.userId);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Star sonini töğri kiriting" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order || order.status !== "OPEN") {
    return mobileJson({ error: "Buyurtma navbat uçun oçiq emas" }, { status: 400 });
  }

  const offer = await db.offer.findUnique({
    where: { orderId_preparerId: { orderId: id, preparerId: auth.userId } },
  });
  if (!offer) {
    return mobileJson({ error: "Avval taklif yuborişingiz kerak" }, { status: 400 });
  }

  const spend = await useStars({ userId: auth.userId, stars: parsed.data.stars });
  if (!spend.ok) {
    return mobileJson({ error: spend.error }, { status: 400 });
  }

  const updated = await db.offer.update({
    where: { id: offer.id },
    data: { starsSpent: { increment: parsed.data.stars } },
  });

  await logActivity(
    auth.userId,
    "OFFER_BOOST",
    `Navbatda yuqoriga çiqiş uçun ${parsed.data.stars} star sarfladi: «${order.title}» (mobil ilova)`,
    { orderId: id, offerId: offer.id, stars: parsed.data.stars },
  );

  const preparer = await db.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, firstName: true, lastName: true, login: true, email: true },
  });

  await logToGroup(
    "stars",
    "🚀 Navbatda yuqoriga çiqiş (mobil)",
    [
      `«${order.title}»`,
      `Tayyorlovchi: ${userLabel(preparer)}`,
      `Sarflandi: ${parsed.data.stars} ⭐`,
      `Jami star: ${updated.starsSpent} ⭐`,
      `Buyurtma ID: ${id}`,
    ],
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return mobileJson({ offer: { starsSpent: updated.starsSpent } });
}
