import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { updateOrderChannelPost } from "@/lib/telegram";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ action: z.enum(["ACCEPT", "REJECT"]) });

/** Taklifni qabul qilish/rad etish — faqat buyurtmachi uchun. */
export async function PATCH(
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
  if (!parsed.success) return mobileJson({ error: "Notöğri amal" }, { status: 400 });

  const offer = await db.offer.findUnique({ where: { id }, include: { order: true } });
  if (!offer) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (offer.order.ordererId !== auth.userId) {
    return mobileJson({ error: "Ruxsat yöq" }, { status: 403 });
  }

  if (parsed.data.action === "REJECT") {
    await db.offer.update({ where: { id }, data: { status: "REJECTED" } });
    await logActivity(auth.userId, "OFFER_REJECT", `Taklifni rad etdi: «${offer.order.title}» (mobil ilova)`, {
      orderId: offer.orderId,
      offerId: id,
    });
    await logToGroup(
      "offers",
      "❌ Taklif rad etildi (mobil)",
      [`«${offer.order.title}»`],
      siteUrl(`/sardorxon/admin/orders/${offer.orderId}`),
    );
    return mobileJson({ ok: true });
  }

  try {
    await db.$transaction(async (tx) => {
      if (offer.order.status !== "OPEN") {
        throw new Error("Buyurtma allaqaçon band");
      }
      await tx.offer.update({ where: { id }, data: { status: "ACCEPTED" } });
      await tx.offer.updateMany({
        where: { orderId: offer.orderId, NOT: { id } },
        data: { status: "REJECTED" },
      });
      await tx.order.update({
        where: { id: offer.orderId },
        data: { status: "IN_PROGRESS", preparerId: offer.preparerId },
      });
      await tx.user.update({ where: { id: offer.preparerId }, data: { isAvailable: false } });
    });
  } catch {
    return mobileJson({ error: "Buyurtma allaqaçon band" }, { status: 400 });
  }

  await updateOrderChannelPost(offer.orderId);
  await logActivity(
    auth.userId,
    "OFFER_ACCEPT",
    `Taklifni qabul qildi: «${offer.order.title}» — ${offer.price.toLocaleString("ru-RU")} söm (mobil ilova)`,
    { orderId: offer.orderId, offerId: id, price: offer.price },
  );
  await logToGroup(
    "offers",
    "✅ Taklif qabul qilindi (mobil)",
    [`«${offer.order.title}»`, `Narx: ${offer.price.toLocaleString("ru-RU")} söm`],
    siteUrl(`/sardorxon/admin/orders/${offer.orderId}`),
  );

  return mobileJson({ ok: true });
}
