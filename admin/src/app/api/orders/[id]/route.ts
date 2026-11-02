import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { restrictionApiError } from "@/lib/restriction";
import { markOrderRemovedInChannel } from "@/lib/telegram";
import { softDeleteOrder } from "@/lib/order-delete";
import { logActivity } from "@/lib/activity";
import {
  cancelOpenOrder,
  deliverWork,
  orderLockedReason,
  sweepContracts,
} from "@/lib/contract-flow";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;
  await sweepContracts({ orderId: id });

  const order = await db.order.findUnique({
    where: { id },
    include: {
      orderer: {
        select: { id: true, name: true, login: true, avatarUrl: true, image: true },
      },
      preparer: {
        select: { id: true, name: true, login: true, avatarUrl: true, image: true },
      },
      offers: {
        include: {
          preparer: {
            select: {
              id: true,
              name: true,
              login: true,
              avatarUrl: true,
              image: true,
              isAvailable: true,
              ratingCount: true,
              ratingSum: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      files: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  const isParty =
    order.ordererId === session.user.id || order.preparerId === session.user.id;

  // OPEN bo'lmagan / o'chirilgan buyurtma faqat ishtirokchilarga
  if (!isParty && (order.status !== "OPEN" || order.deletedAt)) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  // yopiq fayllarni faqat ishtirokchilarga vaqtinchalik link bilan beramiz
  const files = await Promise.all(
    order.files.map(async (f) => ({
      id: f.id,
      kind: f.kind,
      mimeType: f.mimeType,
      size: f.size,
      url:
        isParty && f.bucket === "private"
          ? await presignGet({ bucket: PRIVATE_BUCKET, key: f.key })
          : null,
    })),
  );

  // buyurtma beruvchi bo'lmagan tayyorlovchi boshqa takliflarni ko'rmasin
  const offers =
    order.ordererId === session.user.id
      ? order.offers
      : order.offers.filter((o) => o.preparerId === session.user.id);

  return NextResponse.json({ order: { ...order, offers, files } });
}

const patchSchema = z.object({
  status: z.enum(["DELIVERED", "CANCELLED"]),
});

/**
 * Tayyorlovchi ishni topshiradi (DELIVERED) yoki buyurtmachi hali shartnoma
 * imzolanmagan (OPEN) buyurtmasini bekor qiladi. Yakunlash — /finalize,
 * imzolangan shartnomani bekor qilish — /contracts/[id] REQUEST_CANCEL.
 */
export async function PATCH(
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

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri status" }, { status: 400 });
  }

  const r =
    parsed.data.status === "DELIVERED"
      ? await deliverWork(id, session.user.id)
      : await cancelOpenOrder(id, session.user.id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}

/** Buyurtmachi o'z buyurtmasini o'chiradi (soft). O'zida qoladi, boshqalarga ko'rinmaydi. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    select: { ordererId: true, deletedAt: true },
  });
  if (!order || order.ordererId !== session.user.id) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }
  if (order.deletedAt) {
    return NextResponse.json({ error: "Allaqachon o'chirilgan" }, { status: 400 });
  }
  await sweepContracts({ orderId: id });
  const locked = await orderLockedReason(id);
  if (locked) return NextResponse.json({ error: locked }, { status: 400 });

  const full = await softDeleteOrder(id, "ORDERER", null);
  if (full?.telegramMessageId) {
    await markOrderRemovedInChannel(
      full.telegramMessageId,
      full.title,
      "Buyurtmachi",
      null,
    );
  }

  await logActivity(
    session.user.id,
    "ORDER_DELETE",
    `Buyurtmani o'chirdi${full?.title ? `: «${full.title}»` : ""}`,
    { orderId: id },
  );

  return NextResponse.json({ ok: true });
}
