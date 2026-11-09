import type { Contract, Order, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";
import { getSupportUserId } from "@/lib/support";
import { sendMobilePush } from "@/lib/fcm";
import { sendPushToUser } from "@/lib/push";
import { updateOrderChannelPost } from "@/lib/telegram";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { refundOfferStars } from "@/lib/stars";
import { shortDateTime } from "@/lib/date";

/**
 * Shartnoma hayot sikli — sayt va mobil ilova API'lari shu yerdagi
 * funksiyalarni chaqiradi (mantiq bitta joyda).
 *
 *  SENT ──(tayyorlovchi qabul qiladi)──> ACCEPTED (buyurtma IN_PROGRESS)
 *    · SENT holatida: buyurtmachi bekor qiladi / tayyorlovchi rad etadi — pul qaytadi
 *  IN_PROGRESS ──(ishni topshirdim)──> DELIVERED
 *    · DELIVERED: buyurtmachi — yakunlash / qayta ishlash / bekor qilish so'rovi
 *  Imzolangan shartnomani bir tomonlama bekor qilib yoki o'chirib bo'lmaydi:
 *    bekor qilish so'rovi (sabab bilan) -> ikkinchi tomon 3 ish kunida javob
 *    beradi: rozi -> pul buyurtmachiga qaytadi; rozi emas -> admin hal qiladi;
 *    javob yo'q -> rozi deb hisoblanadi.
 *  Muddat (sweepContracts):
 *    · muddat tugadi, ish topshirilmagan -> bekor, pul buyurtmachiga
 *    · ish topshirilgan, buyurtmachi reviewDueAt'gacha javob bermadi -> pul tayyorlovchiga
 *    (reviewDueAt = max(muddat, topshirilgan vaqt + 3 ish kuni))
 */

export type FlowResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

const fail = (error: string, status = 400): FlowResult => ({ ok: false, error, status });
const OK: FlowResult = { ok: true };

/** Tranzaksiya ichida holat allaqachon o'zgargan bo'lsa (parallel so'rov). */
class Conflict extends Error {}

const ACTIVE_ORDER: Order["status"][] = ["IN_PROGRESS", "DELIVERED"];
const DAY = 24 * 60 * 60 * 1000;
const TZ_OFFSET = 5 * 60 * 60 * 1000; // Asia/Tashkent, yozgi vaqt yo'q

/** Ish kunlari (dushanba–juma, Toshkent vaqti bilan) qo'shadi. */
export function addBusinessDays(from: Date, n: number): Date {
  let t = from.getTime();
  let added = 0;
  while (added < n) {
    t += DAY;
    const wd = new Date(t + TZ_OFFSET).getUTCDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return new Date(t);
}

export function effectiveDeadline(
  c: Pick<Contract, "deadline">,
  o: Pick<Order, "deadline">,
): Date | null {
  return c.deadline ?? o.deadline ?? null;
}

const som = (n: number) => `${n.toLocaleString("ru-RU")} söm`;

type ContractFull = Contract & {
  order: Order;
  orderer: { login: string | null; name: string | null; firstName: string | null; lastName: string | null; email: string | null };
  preparer: { login: string | null; name: string | null; firstName: string | null; lastName: string | null; email: string | null };
};

const labelSel = { login: true, name: true, firstName: true, lastName: true, email: true } as const;

async function loadContract(id: string): Promise<ContractFull | null> {
  return db.contract.findUnique({
    where: { id },
    include: { order: true, orderer: { select: labelSel }, preparer: { select: labelSel } },
  });
}

/** Buyurtmadagi faol (imzolangan) shartnoma. */
async function activeContractOf(orderId: string): Promise<ContractFull | null> {
  const c = await db.contract.findFirst({
    where: { orderId, status: "ACCEPTED", order: { status: { in: ACTIVE_ORDER } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return c ? loadContract(c.id) : null;
}

/**
 * Shartnoma tomonlari suhbatiga tizim xabari. actorId — kim harakat qildi
 * (unga emas, ikkinchi tomonga bildirishnoma ketadi). actorId null —
 * avtomatik/admin qarori: xabar "support" nomidan, ikkala tomonga ham push.
 */
async function notice(c: Pick<Contract, "ordererId" | "preparerId" | "orderId">, body: string, actorId: string | null) {
  try {
    const conv = await getOrCreateConversation(c.ordererId, c.preparerId, c.orderId);
    const senderId = actorId ?? (await getSupportUserId());
    const msg = await createMessage({ conversationId: conv.id, senderId, body, system: true, orderId: c.orderId });
    await deliverMessage(msg); // actor bo'lsa — ikkinchi tomonga; bo'lmasa userA'ga
    if (!actorId) {
      const second = conv.userAId === c.ordererId ? c.preparerId : c.ordererId;
      const short = body.length > 120 ? body.slice(0, 120) + "…" : body;
      await Promise.allSettled([
        sendMobilePush(second, { title: "tayyorr.uz", body: short, conversationId: conv.id }),
        sendPushToUser(second, { title: "tayyorr.uz", body: short, url: `/messages/${conv.id}`, tag: conv.id }),
      ]);
    }
  } catch (e) {
    console.error("[contract-flow] notice", e);
  }
}

function groupLines(c: ContractFull, extra: string[] = []) {
  return [
    `«${c.order.title}»`,
    `Buyurtmaçi: ${userLabel(c.orderer)}`,
    `Tayyorlovçi: ${userLabel(c.preparer)}`,
    `Summa: ${som(c.amount)}`,
    ...extra,
    `Şartnoma ID: ${c.id}`,
  ];
}

const adminUrl = (orderId: string) => siteUrl(`/sardorxon/admin/orders/${orderId}`);

// ---------------------------------------------------------------- pul harakatlari

/** Eskroudagi summani buyurtmachiga qaytaradi, buyurtma bekor bo'ladi. */
async function refundTx(
  tx: Prisma.TransactionClient,
  c: Contract,
  note: string,
  extra: Prisma.ContractUpdateInput = {},
) {
  const upd = await tx.order.updateMany({
    where: { id: c.orderId, status: { in: ACTIVE_ORDER } },
    data: { status: "CANCELLED" },
  });
  if (upd.count !== 1) throw new Conflict();
  await tx.contract.update({
    where: { id: c.id },
    data: {
      status: "CANCELLED",
      resolvedAt: new Date(),
      commissionAmount: 0,
      refundAmount: c.amount,
      cancelState: null,
      ...extra,
    },
  });
  await tx.user.update({ where: { id: c.ordererId }, data: { balance: { increment: c.amount } } });
  await tx.user.update({ where: { id: c.preparerId }, data: { isAvailable: true } });
  await tx.walletTransaction.create({
    data: { userId: c.ordererId, type: "REFUND", amount: c.amount, method: "ESCROW", note },
  });
}

/** Eskroudagi summa to'liq tayyorlovchiga o'tadi, buyurtma yakunlanadi. */
async function payoutTx(
  tx: Prisma.TransactionClient,
  c: Contract & { order: Order },
  note: string,
  extra: Prisma.ContractUpdateInput = {},
) {
  const upd = await tx.order.updateMany({
    where: { id: c.orderId, status: { in: ACTIVE_ORDER } },
    data: { status: "DONE" },
  });
  if (upd.count !== 1) throw new Conflict();
  await tx.contract.update({
    where: { id: c.id },
    data: { commissionAmount: 0, payoutAmount: c.amount, cancelState: null, ...extra },
  });
  await tx.user.update({
    where: { id: c.preparerId },
    data: { balance: { increment: c.amount }, isAvailable: true },
  });
  await tx.walletTransaction.create({
    data: { userId: c.preparerId, type: "RELEASE", amount: c.amount, method: "ESCROW", note },
  });
}

async function runTx(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<boolean> {
  try {
    await db.$transaction(fn);
    return true;
  } catch (e) {
    if (e instanceof Conflict) return false;
    throw e;
  }
}

const STALE = fail("Holat özgargan — sahifani yangilang", 409);

// ---------------------------------------------------------------- SENT shartnoma

/** Yuborilgan (hali imzolanmagan) shartnoma: qabul / rad / bekor. */
async function handleSent(c: ContractFull, me: string, action: "ACCEPT" | "DECLINE" | "CANCEL"): Promise<FlowResult> {
  const isOrderer = c.ordererId === me;
  const isPreparer = c.preparerId === me;

  if ((action === "DECLINE" && isPreparer) || (action === "CANCEL" && isOrderer)) {
    const ok = await runTx(async (tx) => {
      const upd = await tx.contract.updateMany({
        where: { id: c.id, status: "SENT" },
        data: {
          status: action === "DECLINE" ? "DECLINED" : "CANCELLED",
          resolvedAt: new Date(),
          refundAmount: c.amount,
        },
      });
      if (upd.count !== 1) throw new Conflict();
      await tx.user.update({ where: { id: c.ordererId }, data: { balance: { increment: c.amount } } });
      await tx.walletTransaction.create({
        data: {
          userId: c.ordererId,
          type: "REFUND",
          amount: c.amount,
          method: "ESCROW",
          note:
            action === "DECLINE"
              ? "Tayyorlovçi şartnomani rad etdi — mablağ qaytdi"
              : "Şartnoma bekor qilindi — mablağ qaytdi",
        },
      });
    });
    if (!ok) return STALE;
    await notice(
      c,
      action === "DECLINE"
        ? "📄 Şartnoma rad etildi. Bloklangan mablağ buyurtmaçiga qaytarildi."
        : "📄 Şartnoma bekor qilindi. Bloklangan mablağ qaytarildi.",
      me,
    );
    await logActivity(
      me,
      action === "DECLINE" ? "CONTRACT_DECLINE" : "CONTRACT_CANCEL",
      `${action === "DECLINE" ? "Şartnomani rad etdi" : "Şartnomani bekor qildi"}: «${c.order.title}»`,
      { orderId: c.orderId, contractId: c.id },
    );
    await logToGroup(
      "contracts",
      action === "DECLINE" ? "📄 Şartnoma rad etildi" : "📄 Şartnoma bekor qilindi",
      groupLines(c, [`${som(c.amount)} qaytarildi`]),
      adminUrl(c.orderId),
    );
    return OK;
  }

  if (action === "ACCEPT" && isPreparer) {
    if (c.order.status !== "OPEN" || c.order.deletedAt) return fail("Buyurtma allaqaçon band");
    const dl = effectiveDeadline(c, c.order);
    if (dl && dl.getTime() <= Date.now()) {
      return fail("Şartnoma muddati ötib ketgan — buyurtmaçidan yangi şartnoma sörang");
    }
    const ok = await runTx(async (tx) => {
      const upd = await tx.order.updateMany({
        where: { id: c.orderId, status: "OPEN" },
        data: { status: "IN_PROGRESS", preparerId: me, budget: c.amount },
      });
      if (upd.count !== 1) throw new Conflict();
      const cu = await tx.contract.updateMany({
        where: { id: c.id, status: "SENT" },
        data: { status: "ACCEPTED", resolvedAt: new Date(), deadline: dl },
      });
      if (cu.count !== 1) throw new Conflict();
      await tx.contract.updateMany({
        where: { orderId: c.orderId, status: "SENT", NOT: { id: c.id } },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      await tx.offer.updateMany({ where: { orderId: c.orderId, preparerId: me }, data: { status: "ACCEPTED" } });
      await tx.offer.updateMany({ where: { orderId: c.orderId, NOT: { preparerId: me } }, data: { status: "REJECTED" } });
      await tx.user.update({ where: { id: me }, data: { isAvailable: false } });
    });
    if (!ok) return STALE;
    await notice(
      c,
      "✅ Şartnoma imzolandi. Iş boşlandi." +
        (dl ? `\nTopşiriş muddati: ${shortDateTime(dl)}.` : "") +
        "\nEndi şartnomani faqat ikki tomon roziligi bilan (yoki admin qarori bilan) bekor qiliş mumkin.",
      me,
    );
    await updateOrderChannelPost(c.orderId);
    await logActivity(
      me,
      "CONTRACT_ACCEPT",
      `Şartnomani qabul qildi: «${c.order.title}» — ${som(c.amount)}`,
      { orderId: c.orderId, contractId: c.id, amount: c.amount },
    );
    await logToGroup("contracts", "✅ Şartnoma qabul qilindi", groupLines(c), adminUrl(c.orderId));
    return OK;
  }

  return fail("Ruxsat yöq", 403);
}

// ---------------------------------------------------------------- bekor qilish so'rovi

const roleName = (c: Contract, userId: string) => (c.ordererId === userId ? "Buyurtmaçi" : "Tayyorlovçi");

async function requestCancel(c: ContractFull, me: string, reason: string): Promise<FlowResult> {
  if (c.cancelState === "PENDING") return fail("Bekor qiliş sörovi allaqaçon yuborilgan");
  if (c.cancelState === "DISPUTED") return fail("Masala admin körib çiqmoqda");
  const now = new Date();
  const due = addBusinessDays(now, 3);
  const upd = await db.contract.updateMany({
    where: { id: c.id, status: "ACCEPTED", cancelState: null },
    data: {
      cancelState: "PENDING",
      cancelRequestedById: me,
      cancelReason: reason,
      cancelRequestedAt: now,
      cancelDueAt: due,
      cancelRejectReason: null,
    },
  });
  if (upd.count !== 1) return STALE;
  await notice(
    c,
    `⚠️ ${roleName(c, me)} buyurtmani bekor qilmoqçi.\nSabab: ${reason}\n\n` +
      `${roleName(c, me === c.ordererId ? c.preparerId : c.ordererId)}, rostdan ham bekor qilinsinmi? ` +
      `${shortDateTime(due)} gaça buyurtma sahifasida javob bering: rozi bölsangiz — ${som(c.amount)} buyurtmaçiga qaytariladi, ` +
      `rozi bölmasangiz (sababi bilan) — javobingiz ${roleName(c, me).toLowerCase()}ga qaytadi va u şartnomani davom ettiriş ` +
      `yoki masalani admin'ga yuboriş haqida qaror qiladi. Javob bölmasa, rozi deb hisoblanadi.`,
    me,
  );
  await logActivity(me, "CONTRACT_CANCEL_REQUEST", `Bekor qilişni söradi: «${c.order.title}» — ${reason}`, {
    orderId: c.orderId,
    contractId: c.id,
  });
  await logToGroup(
    "contracts",
    "⚠️ Bekor qiliş söraldi",
    groupLines(c, [`Kim: ${roleName(c, me)}`, `Sabab: ${reason}`, `Javob muddati: ${shortDateTime(due)}`]),
    adminUrl(c.orderId),
  );
  return OK;
}

async function approveCancel(c: ContractFull, actorId: string | null): Promise<FlowResult> {
  const ok = await runTx(async (tx) => {
    const g = await tx.contract.updateMany({
      where: { id: c.id, cancelState: "PENDING" },
      data: { cancelState: null },
    });
    if (g.count !== 1) throw new Conflict();
    await refundTx(tx, c, "Şartnoma ikki tomon kelişuvi bilan bekor qilindi — mablağ qaytdi");
  });
  if (!ok) return STALE;
  await notice(
    c,
    actorId
      ? `✅ Bekor qiliş söroviga rozilik berildi. Şartnoma bekor qilindi, ${som(c.amount)} buyurtmaçiga qaytarildi.`
      : `⏱ Bekor qiliş söroviga 3 iş kuni içida javob berilmadi — rozi deb hisoblandi. Şartnoma bekor qilindi, ${som(c.amount)} buyurtmaçiga qaytarildi.`,
    actorId,
  );
  await updateOrderChannelPost(c.orderId);
  await refundOfferStars(c.orderId, "bekor qilindi");
  if (actorId) {
    await logActivity(actorId, "CONTRACT_CANCEL_RESPOND", `Bekor qilişga rozi böldi: «${c.order.title}»`, {
      orderId: c.orderId,
      contractId: c.id,
    });
  }
  await logToGroup(
    "contracts",
    actorId ? "📄 Şartnoma kelişib bekor qilindi" : "⏱ Javobsiz — şartnoma bekor qilindi",
    groupLines(c, [`Qaytarildi: ${som(c.amount)}`]),
    adminUrl(c.orderId),
  );
  return OK;
}

/**
 * Ikkinchi tomon rozi bo'lmadi — masala darhol adminga emas, avval so'ragan tomonga qaytadi:
 * u 3 ish kuni ichida shartnomani davom ettiradi yoki "qarorimni o'zgartirmayman" deb adminga yuboradi
 * (INSIST_CANCEL). Javob bo'lmasa — shartnoma davom etadi (sweepContracts).
 * Holat: cancelState PENDING + cancelRejectReason to'ldirilgan = so'ragan tomon qaror qilmoqda.
 */
async function rejectCancel(c: ContractFull, me: string, reason: string): Promise<FlowResult> {
  const due = addBusinessDays(new Date(), 3);
  const upd = await db.contract.updateMany({
    where: { id: c.id, status: "ACCEPTED", cancelState: "PENDING", cancelRejectReason: null },
    data: { cancelRejectReason: reason, cancelDueAt: due },
  });
  if (upd.count !== 1) return STALE;
  const requester = roleName(c, c.cancelRequestedById ?? "");
  await notice(
    c,
    `🚫 ${roleName(c, me)} bekor qilişga rozi bölmadi.\nSabab: ${reason}\n\n` +
      `${requester}, endi siz tanlang (${shortDateTime(due)} gaça, buyurtma sahifasida):\n` +
      `• «Şartnomani davom ettiraman» — iş davom etadi;\n` +
      `• «Qarorimni özgartirmayman» — masala administratorga yuboriladi.\n` +
      `Tanlov bölmasa — şartnoma davom etadi.`,
    me,
  );
  await logActivity(me, "CONTRACT_CANCEL_RESPOND", `Bekor qilişga rozi bölmadi: «${c.order.title}» — ${reason}`, {
    orderId: c.orderId,
    contractId: c.id,
  });
  await logToGroup(
    "contracts",
    "🚫 Bekor qilişga rozi bölinmadi — söragan tomon qaror qiladi",
    groupLines(c, [`Söragan: ${requester}`, `Bekor qiliş sababi: ${c.cancelReason ?? "—"}`, `Rad etiş sababi: ${reason}`, `Qaror muddati: ${shortDateTime(due)}`]),
    adminUrl(c.orderId),
  );
  return OK;
}

/** So'ragan tomon qarorini o'zgartirmadi — endi masalani admin hal qiladi. */
async function insistCancel(c: ContractFull, me: string): Promise<FlowResult> {
  const upd = await db.contract.updateMany({
    where: { id: c.id, status: "ACCEPTED", cancelState: "PENDING", cancelRequestedById: me, cancelRejectReason: { not: null } },
    data: { cancelState: "DISPUTED", cancelDueAt: null },
  });
  if (upd.count !== 1) return STALE;
  await notice(
    c,
    `⚖️ ${roleName(c, me)} bekor qiliş qarorini özgartirmadi. Masala administratorga yuborildi — ` +
      `u bekor qiliş, davom ettiriş yoki yakunlaş böyiça qaror qabul qiladi.`,
    me,
  );
  await logActivity(me, "CONTRACT_CANCEL_REQUEST", `Bekor qiliş qarorida turib oldi — admin'ga: «${c.order.title}»`, {
    orderId: c.orderId,
    contractId: c.id,
  });
  await logToGroup(
    "contracts",
    "⚖️ NIZO — admin qarori kerak",
    groupLines(c, [
      `Söragan: ${roleName(c, me)}`,
      `Bekor qiliş sababi: ${c.cancelReason ?? "—"}`,
      `Rad etiş sababi: ${c.cancelRejectReason ?? "—"}`,
    ]),
    adminUrl(c.orderId),
  );
  return OK;
}

async function withdrawCancel(c: ContractFull, me: string): Promise<FlowResult> {
  const wasRejected = !!c.cancelRejectReason;
  const upd = await db.contract.updateMany({
    where: { id: c.id, status: "ACCEPTED", cancelState: "PENDING", cancelRequestedById: me },
    data: { cancelState: null, cancelDueAt: null, cancelRejectReason: null },
  });
  if (upd.count !== 1) return STALE;
  await notice(
    c,
    wasRejected
      ? `🤝 ${roleName(c, me)} şartnomani davom ettirişni tanladi. Iş davom etadi.`
      : "↩️ Bekor qiliş sörovi qaytarib olindi. Iş davom etadi.",
    me,
  );
  return OK;
}

// ---------------------------------------------------------------- umumiy kirish nuqtasi

export type ContractAction =
  | { action: "ACCEPT" | "DECLINE" | "CANCEL" }
  | { action: "REQUEST_CANCEL"; reason: string }
  | { action: "APPROVE_CANCEL" }
  | { action: "REJECT_CANCEL"; reason: string }
  | { action: "WITHDRAW_CANCEL" }
  | { action: "INSIST_CANCEL" };

export async function contractAction(contractId: string, me: string, input: ContractAction): Promise<FlowResult> {
  await sweepContracts({ contractId });
  const c = await loadContract(contractId);
  if (!c) return fail("Topilmadi", 404);
  const isParty = c.ordererId === me || c.preparerId === me;
  if (!isParty) return fail("Ruxsat yöq", 403);

  if (c.status === "SENT") {
    if (input.action === "ACCEPT" || input.action === "DECLINE" || input.action === "CANCEL") {
      return handleSent(c, me, input.action);
    }
    return fail("Şartnoma hali imzolanmagan");
  }

  if (c.status !== "ACCEPTED" || !ACTIVE_ORDER.includes(c.order.status)) {
    return fail("Şartnoma allaqaçon hal qilingan");
  }

  switch (input.action) {
    case "CANCEL":
      return fail(
        "Imzolangan şartnomani bir tomonlama bekor qilib bölmaydi — «Bekor qilişni söraş» orqali ikkinçi tomonga sörov yuboring",
      );
    case "REQUEST_CANCEL":
      return requestCancel(c, me, input.reason);
    case "APPROVE_CANCEL":
      if (c.cancelState !== "PENDING") return fail("Faol bekor qiliş sörovi yöq");
      if (c.cancelRequestedById === me) return fail("Öz sörovingizga javob bera olmaysiz");
      if (c.cancelRejectReason) return fail("Javobingiz yuborilgan — endi bekor qilişni söragan tomon qaror qiladi");
      return approveCancel(c, me);
    case "REJECT_CANCEL":
      if (c.cancelState !== "PENDING") return fail("Faol bekor qiliş sörovi yöq");
      if (c.cancelRequestedById === me) return fail("Öz sörovingizga javob bera olmaysiz");
      if (c.cancelRejectReason) return fail("Javobingiz yuborilgan — endi bekor qilişni söragan tomon qaror qiladi");
      return rejectCancel(c, me, input.reason);
    case "WITHDRAW_CANCEL":
      return withdrawCancel(c, me);
    case "INSIST_CANCEL":
      if (c.cancelState !== "PENDING" || !c.cancelRejectReason) return fail("Hozir bu amal mavjud emas");
      if (c.cancelRequestedById !== me) return fail("Bu qarorni faqat bekor qilişni söragan tomon qabul qiladi");
      return insistCancel(c, me);
    default:
      return fail("Notöğri amal");
  }
}

// ---------------------------------------------------------------- topshirish / yakunlash / qayta ishlash

export async function deliverWork(orderId: string, me: string): Promise<FlowResult> {
  await sweepContracts({ orderId });
  const c = await activeContractOf(orderId);
  if (!c) return fail("Faol şartnoma yöq");
  if (c.preparerId !== me) return fail("Ruxsat yöq", 403);
  if (c.order.status !== "IN_PROGRESS") return fail("Iş allaqaçon topşirilgan");
  if (c.cancelState === "DISPUTED") return fail("Masala admin körib çiqmoqda");

  const now = new Date();
  const dl = effectiveDeadline(c, c.order);
  const review = addBusinessDays(now, 3);
  const due = dl && dl > review ? dl : review;

  const ok = await runTx(async (tx) => {
    const upd = await tx.order.updateMany({
      where: { id: orderId, status: "IN_PROGRESS" },
      data: { status: "DELIVERED" },
    });
    if (upd.count !== 1) throw new Conflict();
    await tx.contract.update({ where: { id: c.id }, data: { deliveredAt: now, reviewDueAt: due } });
  });
  if (!ok) return STALE;

  await notice(
    c,
    `📦 Iş topşirildi. Buyurtma sahifasida tekşirib: «Yakunlaş», «Qayta işlaş» yoki «Bekor qilişni söraş»ni tanlang.\n` +
      `${shortDateTime(due)} gaça javob bölmasa, iş muvaffaqiyatli deb topiladi va ${som(c.amount)} tayyorlovçiga ötadi.`,
    me,
  );
  await updateOrderChannelPost(orderId);
  await logActivity(me, "ORDER_DELIVER", `Işni topşirdi: «${c.order.title}»`, { orderId });
  await logToGroup("orders", "📦 Iş topşirildi", [`«${c.order.title}»`, `Tekşiruv muddati: ${shortDateTime(due)}`, `Buyurtma ID: ${orderId}`], adminUrl(orderId));
  return OK;
}

export async function finalizeWork(orderId: string, me: string): Promise<FlowResult> {
  await sweepContracts({ orderId });
  const c = await activeContractOf(orderId);
  if (!c) return fail("Faol şartnoma yöq");
  if (c.ordererId !== me) return fail("Faqat buyurtma egasi yakunlaydi", 403);
  if (c.cancelState === "DISPUTED") return fail("Masala admin körib çiqmoqda");

  const ok = await runTx((tx) => payoutTx(tx, c, `Iş yakunlandi: ${c.order.title} (komissiyasiz, töliq)`));
  if (!ok) return STALE;

  await notice(c, `🎉 Buyurtma yakunlandi. ${som(c.amount)} töliq tayyorlovçi hisobiga ötkazildi.`, me);
  await updateOrderChannelPost(orderId);
  await logActivity(me, "ORDER_FINALIZE", `Işni yakunladi: «${c.order.title}» — tayyorlovçiga ${som(c.amount)}`, {
    orderId,
    payout: c.amount,
  });
  await logToGroup("completed", "✅ Iş yakunlandi", groupLines(c, [`Tayyorlovçiga: ${som(c.amount)}`]), adminUrl(orderId));
  return OK;
}

export async function requestRevision(orderId: string, me: string, reason: string, deadline: Date): Promise<FlowResult> {
  await sweepContracts({ orderId });
  const c = await activeContractOf(orderId);
  if (!c) return fail("Faol şartnoma yöq");
  if (c.ordererId !== me) return fail("Ruxsat yöq", 403);
  if (c.order.status !== "DELIVERED") return fail("Iş hali topşirilmagan");
  if (c.cancelState) return fail("Avval bekor qiliş sörovini hal qiling");
  if (deadline.getTime() <= Date.now() + 30 * 60 * 1000) {
    return fail("Yangi muddat kamida 30 daqiqadan keyin bölsin");
  }

  const ok = await runTx(async (tx) => {
    const upd = await tx.order.updateMany({
      where: { id: orderId, status: "DELIVERED" },
      data: { status: "IN_PROGRESS" },
    });
    if (upd.count !== 1) throw new Conflict();
    await tx.contract.update({
      where: { id: c.id },
      data: { deadline, deliveredAt: null, reviewDueAt: null, revisionCount: { increment: 1 } },
    });
  });
  if (!ok) return STALE;

  await notice(
    c,
    `🔁 Buyurtmaçi işni qayta işlaşga qaytardi.\nSabab: ${reason}\nYangi muddat: ${shortDateTime(deadline)}.`,
    me,
  );
  await updateOrderChannelPost(orderId);
  await logActivity(me, "ORDER_REVISION", `Qayta işlaşga qaytardi: «${c.order.title}» — ${reason}`, { orderId });
  await logToGroup(
    "orders",
    "🔁 Qayta işlaşga qaytarildi",
    [`«${c.order.title}»`, `Sabab: ${reason}`, `Yangi muddat: ${shortDateTime(deadline)}`, `Buyurtma ID: ${orderId}`],
    adminUrl(orderId),
  );
  return OK;
}

/** Hali hech kim bilan shartnoma imzolanmagan (OPEN) buyurtmani bekor qilish. */
export async function cancelOpenOrder(orderId: string, me: string): Promise<FlowResult> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("Topilmadi", 404);
  if (order.ordererId !== me) return fail("Ruxsat yöq", 403);
  if (order.status !== "OPEN") {
    return fail("Şartnoma imzolangan buyurtmani bekor qiliş uçun «Bekor qilişni söraş»dan foydalaning");
  }
  const sent = await db.contract.findMany({ where: { orderId, status: "SENT" } });
  const ok = await runTx(async (tx) => {
    const upd = await tx.order.updateMany({ where: { id: orderId, status: "OPEN" }, data: { status: "CANCELLED" } });
    if (upd.count !== 1) throw new Conflict();
    for (const s of sent) {
      const cu = await tx.contract.updateMany({
        where: { id: s.id, status: "SENT" },
        data: { status: "CANCELLED", resolvedAt: new Date(), refundAmount: s.amount },
      });
      if (cu.count !== 1) continue;
      await tx.user.update({ where: { id: s.ordererId }, data: { balance: { increment: s.amount } } });
      await tx.walletTransaction.create({
        data: { userId: s.ordererId, type: "REFUND", amount: s.amount, method: "ESCROW", note: "Buyurtma bekor qilindi — bloklangan mablağ qaytdi" },
      });
    }
  });
  if (!ok) return STALE;
  for (const s of sent) await notice(s, "📄 Buyurtma bekor qilindi — yuborilgan şartnoma ham bekor böldi.", me);
  await updateOrderChannelPost(orderId);
  await refundOfferStars(orderId, "bekor qilindi");
  await logActivity(me, "ORDER_CANCEL", `Buyurtmani bekor qildi: «${order.title}»`, { orderId });
  await logToGroup("orders", "🚫 Buyurtma bekor qilindi", [`«${order.title}»`, `Buyurtma ID: ${orderId}`], adminUrl(orderId));
  return OK;
}

/** Buyurtmachi o'chira oladimi: imzolangan faol shartnoma bo'lsa — yo'q. */
export async function orderLockedReason(orderId: string): Promise<string | null> {
  const active = await db.contract.count({
    where: { orderId, status: "ACCEPTED", order: { status: { in: ACTIVE_ORDER } } },
  });
  return active
    ? "Imzolangan şartnoma bor — buyurtmani öçirib yoki bir tomonlama bekor qilib bölmaydi. «Bekor qilişni söraş»dan foydalaning."
    : null;
}

// ---------------------------------------------------------------- admin qarori

export type AdminDecision = "CANCEL" | "CONTINUE" | "COMPLETE";

export async function adminResolve(
  contractId: string,
  decision: AdminDecision,
  note: string,
  newDeadline: Date | null,
): Promise<FlowResult> {
  const c = await loadContract(contractId);
  if (!c) return fail("Topilmadi", 404);
  if (c.status !== "ACCEPTED" || !ACTIVE_ORDER.includes(c.order.status)) return fail("Şartnoma faol emas");
  const extra = { disputeResolution: decision, disputeNote: note, disputeResolvedAt: new Date() };

  if (decision === "CANCEL") {
    const ok = await runTx((tx) => refundTx(tx, c, "Admin qarori: şartnoma bekor qilindi — mablağ qaytdi", extra));
    if (!ok) return STALE;
    await notice(c, `⚖️ Administrator qarori: şartnoma bekor qilindi. ${som(c.amount)} buyurtmaçiga qaytarildi.\nIzoh: ${note}`, null);
    await refundOfferStars(c.orderId, "bekor qilindi");
  } else if (decision === "COMPLETE") {
    const ok = await runTx((tx) => payoutTx(tx, c, `Admin qarori: iş yakunlandi — ${c.order.title}`, extra));
    if (!ok) return STALE;
    await notice(c, `⚖️ Administrator qarori: iş muvaffaqiyatli yakunlandi. ${som(c.amount)} tayyorlovçiga ötkazildi.\nIzoh: ${note}`, null);
  } else {
    const dl = newDeadline ?? effectiveDeadline(c, c.order);
    if (!dl || dl.getTime() <= Date.now()) return fail("Davom ettiriş uçun kelajakdagi yangi muddatni belgilang");
    const delivered = c.order.status === "DELIVERED";
    const review = addBusinessDays(new Date(), 3);
    await db.contract.update({
      where: { id: c.id },
      data: {
        ...extra,
        cancelState: null,
        cancelDueAt: null,
        deadline: dl,
        reviewDueAt: delivered ? (dl > review ? dl : review) : null,
      },
    });
    await notice(c, `⚖️ Administrator qarori: şartnoma davom etadi. Muddat: ${shortDateTime(dl)}.\nIzoh: ${note}`, null);
  }
  await updateOrderChannelPost(c.orderId);
  await logToGroup(
    "contracts",
    `⚖️ Admin qarori: ${decision === "CANCEL" ? "bekor qilindi" : decision === "COMPLETE" ? "yakunlandi" : "davom etadi"}`,
    groupLines(c, [`Izoh: ${note}`]),
    adminUrl(c.orderId),
  );
  return OK;
}

// ---------------------------------------------------------------- muddatlar (avtomatik)

let lastGlobalSweep = 0;

/**
 * Muddati o'tgan holatlarni hal qiladi. Hamma amallar shartli (holat
 * o'zgarmagan bo'lsagina), shuning uchun parallel chaqiruvlar xavfsiz.
 * Argumentsiz chaqirilsa — hamma shartnomalar (bir instansiyada daqiqada 1 marta).
 */
export async function sweepContracts(scope: { orderId?: string; contractId?: string; force?: boolean } = {}) {
  const global = !scope.orderId && !scope.contractId;
  if (global && !scope.force) {
    if (Date.now() - lastGlobalSweep < 60_000) return;
    lastGlobalSweep = Date.now();
  }
  try {
    const now = new Date();
    const rows = await db.contract.findMany({
      where: {
        status: "ACCEPTED",
        order: { status: { in: ACTIVE_ORDER }, ...(scope.orderId ? { id: scope.orderId } : {}) },
        ...(scope.contractId ? { id: scope.contractId } : {}),
        OR: [{ cancelState: null }, { cancelState: "PENDING", cancelDueAt: { lte: now } }],
      },
      include: { order: true, orderer: { select: labelSel }, preparer: { select: labelSel } },
      take: 200,
    });
    for (const c of rows) {
      if (c.cancelState === "PENDING") {
        if (c.cancelRejectReason) {
          // ikkinchi tomon rozi bo'lmagan, so'ragan tomon muddatida tanlamadi — shartnoma davom etadi
          const upd = await db.contract.updateMany({
            where: { id: c.id, cancelState: "PENDING", cancelRejectReason: { not: null }, cancelDueAt: { lte: now } },
            data: { cancelState: null, cancelDueAt: null, cancelRejectReason: null },
          });
          if (upd.count === 1) {
            await notice(c, "⏱ Bekor qiliş böyiça qaror bildirilmadi — şartnoma davom etadi.", null);
            await logToGroup("contracts", "⏱ Qaror bildirilmadi — şartnoma davom etadi", groupLines(c), adminUrl(c.orderId));
          }
        } else {
          await approveCancel(c, null);
        }
        continue;
      }
      if (c.order.status === "IN_PROGRESS") {
        const dl = effectiveDeadline(c, c.order);
        if (!dl || dl > now) continue;
        const ok = await runTx((tx) =>
          refundTx(tx, c, "Şartnoma muddati tugadi, iş topşirilmadi — mablağ qaytdi"),
        );
        if (!ok) continue;
        await notice(
          c,
          `⏱ Şartnoma muddati (${shortDateTime(dl)}) tugadi, iş topşirilmadi. Şartnoma bekor qilindi, ${som(c.amount)} buyurtmaçiga qaytarildi.`,
          null,
        );
        await updateOrderChannelPost(c.orderId);
        await refundOfferStars(c.orderId, "bekor qilindi");
        await logToGroup("contracts", "⏱ Muddat tugadi — pul qaytarildi", groupLines(c), adminUrl(c.orderId));
      } else if (c.order.status === "DELIVERED") {
        const due = c.reviewDueAt ?? effectiveDeadline(c, c.order);
        if (!due || due > now) continue;
        const ok = await runTx(async (tx) => {
          // shu orada bekor qilish so'rovi kelgan bo'lsa — avtomatik to'lamaymiz
          const g = await tx.contract.count({ where: { id: c.id, cancelState: null } });
          if (g !== 1) throw new Conflict();
          await payoutTx(tx, c, `Iş topşirilgan, tekşiruv muddati tugadi — avtomatik yakunlandi: ${c.order.title}`);
        });
        if (!ok) continue;
        await notice(
          c,
          `⏱ Tekşiruv muddati tugadi — iş muvaffaqiyatli deb topildi. ${som(c.amount)} tayyorlovçiga ötkazildi.`,
          null,
        );
        await updateOrderChannelPost(c.orderId);
        await logToGroup("completed", "⏱ Avtomatik yakunlandi", groupLines(c), adminUrl(c.orderId));
      }
    }
  } catch (e) {
    console.error("[contract-flow] sweep", e);
  }
}
