import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRestriction } from "@/lib/restriction";
import { scopedRestriction } from "@/lib/restriction-scope";
import { getActiveAnnouncements } from "@/lib/announcement";
import { RestrictionNotice } from "@/components/restriction-notice";
import { AnnouncementCarousel } from "@/components/announcement-banner";
import { OrdersBrowser, type OrderRow } from "@/components/orders-browser";

/**
 * Asosiy: header (qidiruv + filtr) · banner · buyurtmalar lentasi.
 *  - tayyorlovchi: ochiq buyurtmalar + o'ziga biriktirilganlari
 *  - buyurtmachi: BOSHQA foydalanuvchilarning ochiq buyurtmalari — faqat
 *    ko'rish uchun (taklif yubora olmaydi). O'z buyurtmalari — /orders.
 */
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
      : { deletedAt: null, status: "OPEN", ordererId: { not: me.id } },
    orderBy: { createdAt: "desc" },
    // faqat ro'yxat uchun kerakli maydonlar — tayyorlovchi taklifdan oldin
    // ko'radiganidan ortiq hech narsa yuborilmaydi
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      status: true,
      budget: true,
      createdAt: true,
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
    ordererLabel: o.orderer.login ?? o.orderer.name ?? null,
  }));

  return (
    <OrdersBrowser
      orders={rows}
      variant="feed"
      banner={
        announcements.length > 0 ? (
          <AnnouncementCarousel items={announcements} />
        ) : null
      }
    />
  );
}
