import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { markOrderRemovedInChannel } from "@/lib/telegram";
import { logActivity } from "@/lib/activity";
import {
  cancelOpenOrder,
  deliverWork,
  orderLockedReason,
  sweepContracts,
} from "@/lib/contract-flow";
import { contractView } from "@/lib/contract-view";
import { softDeleteOrder } from "@/lib/order-delete";
import { maskName } from "@/lib/mask-name";
import { presenceText } from "@/lib/presence";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";

export { OPTIONS } from "@/lib/mobile-cors";

/** Buyurtma tafsilotlari — takliflar bilan birga (web bilan bir xil mantiq). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await sweepContracts({ orderId: id });

  const order = await db.order.findUnique({
    where: { id },
    include: {
      orderer: { select: { id: true, name: true, login: true, avatarUrl: true, image: true, lastSeenAt: true } },
      preparer: { select: { id: true, name: true, login: true, avatarUrl: true, image: true, lastSeenAt: true } },
      files: true,
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
              about: true,
            },
          },
        },
        // navbat: ko'proq star sarflagan yuqorida, teng bo'lsa birinchi
        // yuborgan yuqorida — web bilan bir xil.
        orderBy: [{ starsSpent: "desc" }, { createdAt: "asc" }],
      },
      contracts: {
        orderBy: { createdAt: "desc" },
        include: { preparer: { select: { name: true, login: true } } },
      },
      review: true,
    },
  });
  if (!order) return mobileJson({ error: "Topilmadi" }, { status: 404 });

  const isOrderer = order.ordererId === auth.userId;
  const isParty = isOrderer || order.preparerId === auth.userId;
  const hasOffered = order.offers.some((o) => o.preparerId === auth.userId);
  if (!isParty && !hasOffered && (order.status !== "OPEN" || order.deletedAt)) {
    return mobileJson({ error: "Topilmadi" }, { status: 404 });
  }

  const offers = isOrderer ? order.offers : order.offers.filter((o) => o.preparerId === auth.userId);

  // navbat: boshqa tayyorlovchilarga o'rin/star ko'rinadi, lekin ism
  // serverda qisman yashiriladi (haqiqiy ism mijozga umuman yuborilmaydi)
  let queue: Array<{
    position: number;
    mine: boolean;
    starsSpent: number;
    visible: string;
    hiddenLen: number;
  }> = [];
  if (!isOrderer) {
    const me = await db.user.findUnique({ where: { id: auth.userId }, select: { role: true } });
    if (me?.role === "PREPARER") {
      queue = order.offers.map((o, i) => {
        const mine = o.preparerId === auth.userId;
        const displayName = o.preparer.name ?? o.preparer.login ?? "Tayyorlovchi";
        const masked = mine ? { visible: displayName, hiddenLen: 0 } : maskName(displayName, 0.2);
        return { position: i + 1, mine, starsSpent: o.starsSpent, ...masked };
      });
    }
  }

  // ishtirokchi: rasm + onlayn holati (webdagi PersonCard bilan bir xil)
  const party = (u: NonNullable<typeof order.preparer>) => ({
    id: u.id,
    name: u.name,
    login: u.login,
    avatarUrl: u.avatarUrl,
    image: u.image,
    presence: presenceText(u.lastSeenAt),
  });

  const files = await Promise.all(
    order.files.map(async (f) => ({
      id: f.id,
      kind: f.kind,
      mimeType: f.mimeType,
      size: f.size,
      url: isParty ? await presignGet({ bucket: PRIVATE_BUCKET, key: f.key }) : null,
    })),
  );

  return mobileJson({
    order: {
      id: order.id,
      title: order.title,
      description: order.description,
      type: order.type,
      status: order.status,
      budget: order.budget,
      deadline: order.deadline?.toISOString() ?? null,
      deletedAt: order.deletedAt?.toISOString() ?? null,
      deletedByRole: order.deletedByRole,
      deleteReason: order.deleteReason,
      createdAt: order.createdAt.toISOString(),
      orderer: party(order.orderer),
      preparer: order.preparer ? party(order.preparer) : null,
      files,
      queue,
      contracts: order.contracts.map((c) => contractView(c, order)),
      review: order.review
        ? { stars: order.review.stars, comment: order.review.comment }
        : null,
      offers: offers.map((o) => ({
        id: o.id,
        price: o.price,
        message: o.message,
        status: o.status,
        starsSpent: o.starsSpent,
        createdAt: o.createdAt.toISOString(),
        preparer: {
          id: o.preparer.id,
          name: o.preparer.name,
          login: o.preparer.login,
          image: o.preparer.avatarUrl ?? o.preparer.image,
          isAvailable: o.preparer.isAvailable,
          rating: o.preparer.ratingCount ? o.preparer.ratingSum / o.preparer.ratingCount : null,
          ratingCount: o.preparer.ratingCount,
          about: o.preparer.about,
        },
      })),
    },
  });
}

const patchSchema = z.object({ status: z.enum(["DELIVERED", "CANCELLED"]) });

/**
 * Tayyorlovchi ishni topshiradi (DELIVERED) yoki buyurtmachi hali shartnoma
 * imzolanmagan (OPEN) buyurtmasini bekor qiladi — web bilan bir xil (lib/contract-flow).
 */
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

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Noto'g'ri status" }, { status: 400 });

  const r =
    parsed.data.status === "DELIVERED"
      ? await deliverWork(id, auth.userId)
      : await cancelOpenOrder(id, auth.userId);
  if (!r.ok) return mobileJson({ error: r.error }, { status: r.status });
  return mobileJson({ ok: true });
}

/** Buyurtmachi o'z buyurtmasini o'chiradi (soft) — web bilan bir xil mantiq. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    select: { ordererId: true, deletedAt: true },
  });
  if (!order || order.ordererId !== auth.userId) {
    return mobileJson({ error: "Topilmadi" }, { status: 404 });
  }
  if (order.deletedAt) {
    return mobileJson({ error: "Allaqachon o'chirilgan" }, { status: 400 });
  }
  await sweepContracts({ orderId: id });
  const locked = await orderLockedReason(id);
  if (locked) return mobileJson({ error: locked }, { status: 400 });

  const full = await softDeleteOrder(id, "ORDERER", null);
  if (full?.telegramMessageId) {
    await markOrderRemovedInChannel(full.telegramMessageId, full.title, "Buyurtmachi", null);
  }

  await logActivity(auth.userId, "ORDER_DELETE", `Buyurtmani o'chirdi${full?.title ? `: «${full.title}»` : ""} (mobil ilova)`, {
    orderId: id,
  });

  return mobileJson({ ok: true });
}
