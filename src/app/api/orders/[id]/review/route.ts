import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { restrictionApiError } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl } from "@/lib/telegram-log";

const schema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

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
    return NextResponse.json({ error: "Bahoni töğri tanlang" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { id },
    include: { review: true },
  });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (order.ordererId !== session.user.id) {
    return NextResponse.json({ error: "Faqat buyurtma egasi baholaydi" }, { status: 403 });
  }
  if (order.status !== "DONE") {
    return NextResponse.json(
      { error: "Faqat yakunlangan işni baholaş mumkin" },
      { status: 400 },
    );
  }
  if (!order.preparerId) {
    return NextResponse.json({ error: "Tayyorlovçi yöq" }, { status: 400 });
  }
  if (order.review) {
    return NextResponse.json({ error: "Bu iş allaqaçon baholangan" }, { status: 409 });
  }

  const { stars, comment } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        orderId: id,
        raterId: session.user!.id,
        targetId: order.preparerId!,
        stars,
        comment: comment || null,
      },
    });
    await tx.user.update({
      where: { id: order.preparerId! },
      data: {
        ratingSum: { increment: stars },
        ratingCount: { increment: 1 },
      },
    });
  });

  await logActivity(
    session.user.id,
    "REVIEW_CREATE",
    `Baho qoldirdi: «${order.title}» — ${stars}/5`,
    { orderId: id, stars },
  );
  await logToGroup(
    "completed",
    "⭐ Işga baho qöyildi",
    [
      `«${order.title}»`,
      `Baho: ${stars}/5`,
      comment ? `Şarh: ${comment}` : "",
      `Buyurtma ID: ${id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return NextResponse.json({ ok: true });
}
