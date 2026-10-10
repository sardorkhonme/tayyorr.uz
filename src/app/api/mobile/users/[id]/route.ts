import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { presenceText } from "@/lib/presence";
import { maskName } from "@/lib/mask-name";
import { blockState } from "@/lib/chat";

export { OPTIONS } from "@/lib/mobile-cors";

/** Ochiq foydalanuvchi profili — web /u/[id] bilan bir xil mantiq. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      login: true,
      email: true,
      role: true,
      about: true,
      avatarUrl: true,
      image: true,
      ratingSum: true,
      ratingCount: true,
      isSupport: true,
      isPlatform: true,
      lastSeenAt: true,
      createdAt: true,
      _count: { select: { ordersCreated: true, ordersTaken: true } },
    },
  });
  if (!user || user.isSupport || user.isPlatform) {
    return mobileJson({ error: "Topilmadi" }, { status: 404 });
  }

  const isOwner = auth.userId === id;
  const displayName =
    user.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null;

  // Bloklagan foydalanuvchiga web'dagidek faqat ism va "o'zi haqida".
  if (!isOwner && (await blockState(auth.userId, id)).blockedMe) {
    return mobileJson({
      user: {
        id: user.id,
        name: displayName,
        login: null,
        role: null,
        about: user.about,
        image: null,
        rating: null,
        ratingCount: 0,
        email: null,
        createdAt: user.createdAt.toISOString(),
        online: false,
        presenceText: "",
        ordersCreated: 0,
        ordersTaken: 0,
        doneOrders: [],
        blockedMe: true,
      },
    });
  }
  const isPreparerProfile = user.role === "PREPARER";
  const avg = user.ratingCount ? user.ratingSum / user.ratingCount : 0;
  const presence = presenceText(user.lastSeenAt);

  let email: { visible: string; hiddenLen: number; full: boolean } | null = null;
  if (user.email) {
    if (isOwner) {
      email = { visible: user.email, hiddenLen: 0, full: true };
    } else {
      const { visible, hiddenLen } = maskName(user.email);
      email = { visible, hiddenLen: Math.min(hiddenLen, 14), full: false };
    }
  }

  const doneOrders = isPreparerProfile
    ? await db.order.findMany({
        where: { preparerId: id, status: "DONE" },
        orderBy: { updatedAt: "desc" },
        take: 100,
        include: { review: true },
      })
    : user.role === "ORDERER"
      ? await db.order.findMany({
          where: { ordererId: id, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { review: true },
        })
      : [];

  return mobileJson({
    user: {
      id: user.id,
      name: displayName,
      login: user.login,
      role: user.role,
      about: user.about,
      image: user.avatarUrl ?? user.image,
      rating: user.ratingCount ? avg : null,
      ratingCount: user.ratingCount,
      email,
      createdAt: user.createdAt.toISOString(),
      online: presence.online,
      presenceText: presence.text,
      ordersCreated: user._count.ordersCreated,
      ordersTaken: user._count.ordersTaken,
      doneOrders: doneOrders.map((o) => ({
        id: o.id,
        title: o.title,
        type: o.type,
        status: o.status,
        date: (isPreparerProfile ? o.updatedAt : o.createdAt).toISOString(),
        reviewStars: o.review?.stars ?? null,
        reviewComment: o.review?.comment ?? null,
      })),
    },
  });
}
