import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRestriction } from "@/lib/restriction";
import { scopedRestriction } from "@/lib/restriction-scope";
import { getActiveAnnouncements } from "@/lib/announcement";
import { RestrictionNotice } from "@/components/restriction-notice";
import { AnnouncementCarousel } from "@/components/announcement-banner";
import { OrdersBrowser, type OrderRow } from "@/components/orders-browser";

export default async function DashboardPage() {
  const session = await auth();
  const restriction = await getRestriction(session!.user.id);
  if (restriction) return <RestrictionNotice restriction={restriction} />;
  // «Tayyorr.uz — butunlay» qisman cheklovi
  const uzAll = await scopedRestriction(session!.user.id, "uz_all");
  if (uzAll) return <RestrictionNotice scoped={uzAll} />;

  const me = session!.user;
  const isPreparer = me.role === "PREPARER";

  const announcements = await getActiveAnnouncements(me.role);

  const orders = await db.order.findMany({
    where: isPreparer
      ? { deletedAt: null, OR: [{ status: "OPEN" }, { preparerId: me.id }] }
      : { ordererId: me.id },
    orderBy: { createdAt: "desc" },
    include: {
      orderer: { select: { name: true, login: true } },
      _count: { select: { offers: true } },
    },
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
    ordererLabel: isPreparer ? o.orderer.login ?? o.orderer.name ?? null : null,
    deleted: !!o.deletedAt,
    deleteReason: o.deleteReason,
    deletedByRole: o.deletedByRole,
  }));

  return (
    <OrdersBrowser
      orders={rows}
      mine={!isPreparer}
      newOrderHref={isPreparer ? undefined : "/orders/new"}
      banner={
        announcements.length > 0 ? (
          <AnnouncementCarousel items={announcements} />
        ) : null
      }
    />
  );
}
