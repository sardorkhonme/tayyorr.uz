import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { OffersBrowser, type OfferRow } from "@/components/offers-browser";

/** Tayyorlovchi yuborgan barcha takliflar — qidiruv va filtr headerda. */
export default async function MyOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const me = session!.user;
  if (me.role !== "PREPARER") redirect("/dashboard");

  const { status } = await searchParams;

  const offers = await db.offer.findMany({
    where: { preparerId: me.id },
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
    orderBy: { createdAt: "desc" },
  });

  const rows: OfferRow[] = offers.map((o) => ({
    id: o.id,
    orderId: o.orderId,
    title: o.order.title,
    type: o.order.type,
    orderStatus: o.order.status,
    orderDeleted: !!o.order.deletedAt,
    price: o.price,
    message: o.message,
    status: o.status,
    starsSpent: o.starsSpent,
    createdAt: o.createdAt.toISOString(),
  }));

  return <OffersBrowser offers={rows} initialOrderStatus={status ?? null} />;
}
