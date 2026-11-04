import { db } from "@/lib/db";
import { chargeFor, num } from "@/lib/format";
import { splitServiceName } from "@/lib/kinds";
import { getPricing, rateFor } from "@/lib/pricing";
import { isHidden } from "@/lib/smm-adjust";
import {
  addOrder,
  fetchStatuses,
  ProviderError,
  providerName,
  type ProviderStatus,
} from "@/lib/provider";
import { explainProviderError } from "@/lib/provider-errors";
import { sendSupportNotice } from "@/lib/support";
import { adminUserUrl, notifyAdmins, userLabel } from "@/lib/telegram";

const USER_SELECT = {
  login: true,
  firstName: true,
  lastName: true,
  name: true,
  email: true,
  balance: true,
} as const;

function som(n: number) {
  return `${num(n)} söm`;
}

export const FINAL_STATUSES = ["COMPLETED", "PARTIAL", "CANCELED", "FAILED"];
const ACTIVE_STATUSES = ["PROCESSING", "IN_PROGRESS"];

export class OrderError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Hamyondan atomik yechadi, buyurtma yozadi, provayderga yuboradi. */
export async function placeOrder(userId: string, serviceId: string, link: string, quantity: number) {
  const service = await db.smmService.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) throw new OrderError("Xizmat topilmadi", 404);
  if (quantity < service.min || quantity > service.max) {
    throw new OrderError(`Miqdor ${service.min} – ${service.max} oraliğida bölsin`);
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { bannedUntil: true } });
  if (!user) throw new OrderError("Hisob topilmadi", 401);
  if (user.bannedUntil && user.bannedUntil > new Date()) {
    throw new OrderError("Hisobingiz vaqtinça çeklangan", 403);
  }

  const pricing = await getPricing();
  if (!pricing) throw new OrderError("Narxni hisoblab bölmadi, birozdan keyin urinib köring", 503);
  if (isHidden(pricing.adjust, service)) throw new OrderError("Xizmat topilmadi", 404);
  const charge = chargeFor(rateFor(service.providerRate, pricing, service), quantity);
  if (charge <= 0) throw new OrderError("Summa notöğri");

  const order = await db.$transaction(async (tx) => {
    // shartli yechish — parallel so'rovlarda balans manfiy bo'lmaydi
    const upd = await tx.user.updateMany({
      where: { id: userId, balance: { gte: charge } },
      data: { balance: { decrement: charge } },
    });
    if (upd.count !== 1) throw new OrderError("Hamyonda mablağ yetarli emas", 402);

    const o = await tx.smmOrder.create({
      data: { userId, serviceId: service.id, link, quantity, charge },
    });
    await tx.walletTransaction.create({
      data: {
        userId,
        type: "SPEND",
        amount: charge,
        method: "SMM",
        note: `tayyorr+: ${service.name} × ${quantity}`,
        meta: { smmOrderId: o.id, serviceId: service.id },
      },
    });
    return o;
  });

  await db.activityLog
    .create({
      data: {
        userId,
        action: "SMM_ORDER",
        summary: `tayyorr+ buyurtma: ${service.name} × ${quantity} (${charge} söm)`,
        meta: { smmOrderId: order.id, link },
      },
    })
    .catch(() => {});

  try {
    const providerOrderId = await addOrder(service.providerId, link, quantity);
    const updated = await db.smmOrder.update({
      where: { id: order.id },
      data: { providerOrderId, status: "PROCESSING" },
    });
    const u = await db.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    await notifyAdmins(
      "orders",
      "🛒 Yangi SMM buyurtma",
      [
        `Foydalanuvçi: ${userLabel(u)}`,
        `Xizmat: ${service.name}`,
        `Havola: ${link}`,
        `Miqdor: ${num(quantity)}`,
        `Summa: ${som(charge)}`,
        `Hamyonda qoldi: ${u ? som(u.balance) : "?"}`,
        `${providerName()} buyurtma: #${providerOrderId}`,
        `Buyurtma ID: ${order.id}`,
      ],
      { text: "Foydalanuvçi", href: adminUserUrl(userId) },
    );
    return updated;
  } catch (e) {
    if (e instanceof ProviderError) {
      // provayder aniq rad etdi — pul to'liq qaytadi; xato o'zbekchaga o'giriladi
      const why = explainProviderError(e.message);
      await finishOrder(order.id, "FAILED", charge, { error: why.admin.slice(0, 300) });
      throw new OrderError(`${why.user} Pul hamyonga qaytarildi.`, 502);
    }
    // tarmoq/timeout — provayderda yaratilgan bo'lishi mumkin, PENDING qoladi (admin tekshiradi)
    await db.smmOrder
      .update({ where: { id: order.id }, data: { error: "Provayder javob bermadi" } })
      .catch(() => {});
    await notifyAdmins(
      "orders",
      `⏳ SMM buyurtma: ${providerName()} javob bermadi — tekşiring`,
      [
        `Xizmat: ${service.name}`,
        `Havola: ${link}`,
        `Miqdor: ${num(quantity)} · ${som(charge)}`,
        `Buyurtma PENDING holatda qoldi (pul yeçilgan). ${providerName()} kabinetida yaratilganini tekşiring.`,
        `Buyurtma ID: ${order.id}`,
      ],
      { text: "Foydalanuvçi", href: adminUserUrl(userId) },
    );
    return order;
  }
}

/**
 * Buyurtmani yakuniy holatga o'tkazadi va kerak bo'lsa pulni qaytaradi.
 * Faqat bir marta ishlaydi (status shartli yangilanadi).
 */
export async function finishOrder(
  orderId: string,
  status: string,
  refund: number,
  extra: { error?: string; startCount?: number | null; remains?: number | null } = {},
) {
  const done = await db.$transaction(async (tx) => {
    const upd = await tx.smmOrder.updateMany({
      where: { id: orderId, status: { notIn: FINAL_STATUSES } },
      data: { status, refundAmount: refund > 0 ? refund : null, checkedAt: new Date(), ...extra },
    });
    if (upd.count !== 1) return false;
    if (refund <= 0) return true;

    const o = await tx.smmOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { service: { select: { name: true } } },
    });
    await tx.user.update({ where: { id: o.userId }, data: { balance: { increment: refund } } });
    await tx.walletTransaction.create({
      data: {
        userId: o.userId,
        type: "REFUND",
        amount: refund,
        method: "SMM",
        note:
          status === "PARTIAL"
            ? `tayyorr+: qisman bajarildi — qolgan qismi qaytdi (${o.service.name})`
            : `tayyorr+: buyurtma bekor böldi — pul qaytdi (${o.service.name})`,
        meta: { smmOrderId: o.id },
      },
    });
    return true;
  });
  if (done) await notifyOrderFinished(orderId);
}

const FINISH_TITLE: Record<string, string> = {
  COMPLETED: "✅ SMM buyurtma bajarildi",
  PARTIAL: "🟡 SMM buyurtma qisman bajarildi",
  CANCELED: "❌ SMM buyurtma bekor qilindi",
  FAILED: "⛔ SMM buyurtma rad etildi",
};

const USER_NOTICE: Record<string, (o: { title: string; qty: string; refund: string }) => string> = {
  COMPLETED: (o) => `✅ Buyurtmangiz bajarildi: ${o.title} — ${o.qty} ta.`,
  PARTIAL: (o) => `🟡 Buyurtmangiz qisman bajarildi: ${o.title}. Bajarilmagan qism uçun ${o.refund} hamyoningizga qaytarildi.`,
  CANCELED: (o) => `❌ Buyurtmangiz bekor qilindi: ${o.title}. ${o.refund} hamyoningizga qaytarildi.`,
  FAILED: (o) => `⛔ Buyurtma qabul qilinmadi: ${o.title}. ${o.refund} hamyoningizga qaytarildi.`,
};

async function notifyOrderFinished(orderId: string) {
  const o = await db.smmOrder.findUnique({
    where: { id: orderId },
    include: { service: { select: { name: true } }, user: { select: USER_SELECT } },
  });
  if (!o) return;
  // foydalanuvchiga — faqat tayyorr+ chatida (tayyorr.uz da ko'rinmaydi)
  const notice = USER_NOTICE[o.status]?.({
    title: splitServiceName(o.service.name).title,
    qty: num(o.quantity),
    refund: som(o.refundAmount ?? 0),
  });
  if (notice) await sendSupportNotice(o.userId, notice).catch(() => {});
  await notifyAdmins(
    "orders",
    FINISH_TITLE[o.status] ?? `SMM buyurtma: ${o.status}`,
    [
      `Foydalanuvçi: ${userLabel(o.user)}`,
      `Xizmat: ${o.service.name}`,
      `Havola: ${o.link}`,
      `Miqdor: ${num(o.quantity)} · ${som(o.charge)}`,
      o.status === "PARTIAL" && o.remains != null ? `Bajarilmadi: ${num(o.remains)} dona` : "",
      o.refundAmount ? `Qaytarildi: ${som(o.refundAmount)} (hamyon: ${som(o.user.balance)})` : "",
      o.error ? `Sabab: ${o.error}` : "",
      o.providerOrderId ? `${providerName()} buyurtma: #${o.providerOrderId}` : "",
      `Buyurtma ID: ${o.id}`,
    ],
    { text: "Foydalanuvçi", href: adminUserUrl(o.userId) },
  );
}

function toInt(v: string | number | undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Faol buyurtmalar holatini provayderdan yangilaydi (ixtiyoriy: faqat bitta foydalanuvchi). */
export async function syncOrders(userId?: string) {
  const orders = await db.smmOrder.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: ACTIVE_STATUSES },
      providerOrderId: { not: null },
      OR: [{ checkedAt: null }, { checkedAt: { lt: new Date(Date.now() - 60_000) } }],
    },
    orderBy: { checkedAt: { sort: "asc", nulls: "first" } },
    take: 100,
  });
  if (!orders.length) return 0;

  let statuses: Record<string, ProviderStatus>;
  try {
    statuses = await fetchStatuses(orders.map((o) => o.providerOrderId!));
  } catch {
    return 0;
  }

  for (const o of orders) {
    const s = statuses[String(o.providerOrderId)];
    if (!s || s.error || !s.status) continue;
    const startCount = toInt(s.start_count);
    const remains = toInt(s.remains);
    const st = s.status.toLowerCase();

    if (st === "completed") {
      await finishOrder(o.id, "COMPLETED", 0, { startCount, remains });
    } else if (st === "partial") {
      const left = Math.min(Math.max(remains ?? 0, 0), o.quantity);
      await finishOrder(o.id, "PARTIAL", Math.floor((o.charge * left) / o.quantity), {
        startCount,
        remains,
      });
    } else if (st === "canceled" || st === "cancelled") {
      await finishOrder(o.id, "CANCELED", o.charge, { startCount, remains });
    } else {
      await db.smmOrder.updateMany({
        where: { id: o.id, status: { in: ACTIVE_STATUSES } },
        data: {
          status: st === "pending" ? "PROCESSING" : "IN_PROGRESS",
          startCount,
          remains,
          checkedAt: new Date(),
        },
      });
    }
  }
  return orders.length;
}
