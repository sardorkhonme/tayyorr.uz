import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** Buyurtmachi yakunlangan ishga baho qo'yadi — web bilan bir xil mantiq. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

  const restriction = await getRestriction(me);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Bahoni töğri tanlang" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id }, include: { review: true } });
  if (!order) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (order.ordererId !== me) {
    return mobileJson({ error: "Faqat buyurtma egasi baholaydi" }, { status: 403 });
  }
  if (order.status !== "DONE") {
    return mobileJson({ error: "Faqat yakunlangan işni baholaş mumkin" }, { status: 400 });
  }
  if (!order.preparerId) {
    return mobileJson({ error: "Tayyorlovçi yöq" }, { status: 400 });
  }
  if (order.review) {
    return mobileJson({ error: "Bu iş allaqaçon baholangan" }, { status: 409 });
  }

  const { stars, comment } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: { orderId: id, raterId: me, targetId: order.preparerId!, stars, comment: comment || null },
    });
    await tx.user.update({
      where: { id: order.preparerId! },
      data: { ratingSum: { increment: stars }, ratingCount: { increment: 1 } },
    });
  });

  await logActivity(me, "REVIEW_CREATE", `Baho qoldirdi: «${order.title}» — ${stars}/5 (mobil ilova)`, {
    orderId: id,
    stars,
  });
  await logToGroup(
    "completed",
    "⭐ Işga baho qöyildi (mobil)",
    [`«${order.title}»`, `Baho: ${stars}/5`, comment ? `Sharh: ${comment}` : "", `Buyurtma ID: ${id}`].filter(
      Boolean,
    ),
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return mobileJson({ ok: true });
}
