import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { updateOrderChannelPost, markOrderRemovedInChannel } from "@/lib/telegram";
import { logActivity } from "@/lib/activity";
import { refundOfferStars } from "@/lib/stars";
import { logToGroup, siteUrl } from "@/lib/telegram-log";
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
      contracts: order.contracts.map((c) => ({
        id: c.id,
        status: c.status,
        amount: c.amount,
        note: c.note,
        deadline: c.deadline?.toISOString() ?? null,
        preparerId: c.preparerId,
        preparerName: c.preparer.name ?? c.preparer.login ?? "Tayyorlovchi",
        createdAt: c.createdAt.toISOString(),
      })),
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
 * Holatni o'zgartirish: tayyorlovchi topshiradi (DELIVERED), buyurtmachi
 * hali hech kimga topshirilmagan (OPEN) buyurtmasini bekor qiladi.
 * Diqqat: ish YAKUNLASH endi shu yerda emas — /finalize orqali (eskroudan
 * tayyorlovchiga pul o'tishi kerak). Faol shartnoma bor IN_PROGRESS/
 * DELIVERED buyurtmani bekor qilish ham shu yerda emas — /contracts/[id]
 * CANCEL orqali (bloklangan pulni to'g'ri qaytarish uchun).
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

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return mobileJson({ error: "Topilmadi" }, { status: 404 });

  const { status } = parsed.data;
  const isOrderer = order.ordererId === auth.userId;
  const isPreparer = order.preparerId === auth.userId;

  if (status === "DELIVERED" && !isPreparer) {
    return mobileJson({ error: "Ruxsat yo'q" }, { status: 403 });
  }
  if (status === "CANCELLED") {
    if (!isOrderer) return mobileJson({ error: "Ruxsat yo'q" }, { status: 403 });
    if (order.status !== "OPEN") {
      return mobileJson(
        { error: "Ish boshlangan buyurtmani shartnoma orqali bekor qiling" },
        { status: 400 },
      );
    }
  }

  await db.order.update({ where: { id }, data: { status } });

  await updateOrderChannelPost(id);

  if (status === "CANCELLED") {
    await refundOfferStars(id, "Buyurtma bekor qilindi (mobil ilova)");
  }

  await logActivity(
    auth.userId,
    status === "DELIVERED" ? "ORDER_DELIVER" : "ORDER_CANCEL",
    `Buyurtma holati: ${status} — «${order.title}» (mobil ilova)`,
    { orderId: id },
  );
  await logToGroup(
    "orders",
    status === "DELIVERED" ? "📦 Ish topshirildi" : "🚫 Buyurtma bekor qilindi",
    [`«${order.title}»`],
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

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

  const full = await softDeleteOrder(id, "ORDERER", null);
  if (full?.telegramMessageId) {
    await markOrderRemovedInChannel(full.telegramMessageId, full.title, "Buyurtmachi", null);
  }

  await logActivity(auth.userId, "ORDER_DELETE", `Buyurtmani o'chirdi${full?.title ? `: «${full.title}»` : ""} (mobil ilova)`, {
    orderId: id,
  });

  return mobileJson({ ok: true });
}
