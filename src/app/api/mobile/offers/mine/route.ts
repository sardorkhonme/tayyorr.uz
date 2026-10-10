import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Tayyorlovchi yuborgan takliflari ro'yxati — web'dagi /offers bilan bir xil. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const me = await db.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (!me || me.role !== "PREPARER") {
    return mobileJson({ error: "Faqat tayyorlovchilar uchun" }, { status: 403 });
  }

  const offers = await db.offer.findMany({
    where: { preparerId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          budget: true,
          deletedAt: true,
        },
      },
    },
  });

  return mobileJson({
    offers: offers.map((o) => ({
      id: o.id,
      price: o.price,
      message: o.message,
      status: o.status,
      starsSpent: o.starsSpent,
      createdAt: o.createdAt.toISOString(),
      order: {
        id: o.order.id,
        title: o.order.title,
        type: o.order.type,
        status: o.order.status,
        budget: o.order.budget,
        deleted: !!o.order.deletedAt,
      },
    })),
  });
}
