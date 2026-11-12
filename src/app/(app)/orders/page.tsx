import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRestriction } from "@/lib/restriction";
import { scopedRestriction } from "@/lib/restriction-scope";
import { RestrictionNotice } from "@/components/restriction-notice";
import { OrdersBrowser, type OrderRow } from "@/components/orders-browser";

/** «Buyurtmalarim» — buyurtmachining o'z buyurtmalari (tayyorlovchida yo'q). */
export default async function MyOrdersPage() {
  const session = await auth();
  const me = session!.user;
  if (me.role === "PREPARER") redirect("/dashboard");

  const restriction = await getRestriction(me.id);
  if (restriction) return <RestrictionNotice restriction={restriction} />;
  const uzAll = await scopedRestriction(me.id, "uz_all");
  if (uzAll) return <RestrictionNotice scoped={uzAll} />;

  const orders = await db.order.findMany({
    where: { ordererId: me.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true } } },
  });

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    type: o.type,
    status: o.status,
    budget: o.budget,
    offers: o._count.offers,
    createdAt: o.createdAt.toISOString(),
    ordererLabel: null,
    deleted: !!o.deletedAt,
    deleteReason: o.deleteReason,
    deletedByRole: o.deletedByRole,
  }));

  return <OrdersBrowser orders={rows} variant="mine" newOrderHref="/orders/new" />;
}
