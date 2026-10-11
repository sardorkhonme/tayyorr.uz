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

const som = (n: number) => `${n.toLocaleString("ru-RU")} so'm`;

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
    const msg = await createMessage({ conversationId: conv.id, senderId, body, system: true });
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
    `Buyurtmachi: ${userLabel(c.orderer)}`,
    `Tayyorlovchi: ${userLabel(c.preparer)}`,
    `Summa: ${som(c.amount)}`,
    ...extra,
    `Shartnoma ID: ${c.id}`,
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

const STALE = fail("Holat o'zgargan — sahifani yangilang", 409);

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
              ? "Tayyorlovchi shartnomani rad etdi — mablag' qaytdi"
              : "Shartnoma bekor qilindi — mablag' qaytdi",
        },
      });
    });
    if (!ok) return STALE;
    await notice(
      c,
      action === "DECLINE"
        ? "📄 Shartnoma rad etildi. Bloklangan mablag' buyurtmachiga qaytarildi."
        : "📄 Shartnoma bekor qilindi. Bloklangan mablag' qaytarildi.",
      me,
    );
    await logActivity(
      me,
      action === "DECLINE" ? "CONTRACT_DECLINE" : "CONTRACT_CANCEL",
      `${action === "DECLINE" ? "Shartnomani rad etdi" : "Shartnomani bekor qildi"}: «${c.order.title}»`,
      { orderId: c.orderId, contractId: c.id },
    );
    await logToGroup(
      "contracts",
      action === "DECLINE" ? "📄 Shartnoma rad etildi" : "📄 Shartnoma bekor qilindi",
      groupLines(c, [`${som(c.amount)} qaytarildi`]),
      adminUrl(c.orderId),
    );
    return OK;
  }

  if (action === "ACCEPT" && isPreparer) {
    if (c.order.status !== "OPEN" || c.order.deletedAt) return fail("Buyurtma allaqachon band");
    const dl = effectiveDeadline(c, c.order);
    if (dl && dl.getTime() <= Date.now()) {
      return fail("Shartnoma muddati o'tib ketgan — buyurtmachidan yangi shartnoma so'rang");
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
      "✅ Shartnoma imzolandi. Ish boshlandi." +
        (dl ? `\nTopshirish muddati: ${shortDateTime(dl)}.` : "") +
        "\nEndi shartnomani faqat ikki tomon roziligi bilan (yoki admin qarori bilan) bekor qilish mumkin.",
      me,
    );
    await updateOrderChannelPost(c.orderId);
    await logActivity(
      me,
      "CONTRACT_ACCEPT",
      `Shartnomani qabul qildi: «${c.order.title}» — ${som(c.amount)}`,
      { orderId: c.orderId, contractId: c.id, amount: c.amount },
    );
    await logToGroup("contracts", "✅ Shartnoma qabul qilindi", groupLines(c), adminUrl(c.orderId));
    return OK;
  }

  return fail("Ruxsat yo'q", 403);
}

// ---------------------------------------------------------------- bekor qilish so'rovi

const roleName = (c: Contract, userId: string) => (c.ordererId === userId ? "Buyurtmachi" : "Tayyorlovchi");

async function requestCancel(c: ContractFull, me: string, reason: string): Promise<FlowResult> {
  if (c.cancelState === "PENDING") return fail("Bekor qilish so'rovi allaqachon yuborilgan");
  if (c.cancelState === "DISPUTED") return fail("Masala admin ko'rib chiqmoqda");
  const due = addBusinessDays(new Date(), 3);
  const upd = await db.contract.updateMany({
    where: { id: c.id, status: "ACCEPTED", cancelState: null },
    data: {
      cancelState: "PENDING",
      cancelRequestedById: me,
      cancelReason: reason,
      cancelRequestedAt: new Date(),
      cancelDueAt: due,
      cancelRejectReason: null,
    },
  });
  if (upd.count !== 1) return STALE;
  await notice(
    c,
    `⚠️ ${roleName(c, me)} buyurtmani bekor qilmoqchi.\nSabab: ${reason}\n\n` +
      `${roleName(c, me === c.ordererId ? c.preparerId : c.ordererId)}, rostdan ham bekor qilinsinmi? ` +
      `${shortDateTime(due)} gacha buyurtma sahifasida javob bering: rozi bo'lsangiz — ${som(c.amount)} buyurtmachiga qaytariladi, ` +
      `rozi bo'lmasangiz (sababi bilan) — admin hal qiladi. Javob bo'lmasa, rozi deb hisoblanadi.`,
    me,
  );
  await logActivity(me, "CONTRACT_CANCEL_REQUEST", `Bekor qilishni so'radi: «${c.order.title}» — ${reason}`, {
    orderId: c.orderId,
    contractId: c.id,
  });
  await logToGroup(
    "contracts",
    "⚠️ Bekor qilish so'raldi",
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
    await refundTx(tx, c, "Shartnoma ikki tomon kelishuvi bilan bekor qilindi — mablag' qaytdi");
  });
  if (!ok) return STALE;
  await notice(
    c,
    actorId
      ? `✅ Bekor qilish so'roviga rozilik berildi. Shartnoma bekor qilindi, ${som(c.amount)} buyurtmachiga qaytarildi.`
      : `⏱ Bekor qilish so'roviga 3 ish kuni ichida javob berilmadi — rozi deb hisoblandi. Shartnoma bekor qilindi, ${som(c.amount)} buyurtmachiga qaytarildi.`,
    actorId,
  );
  await updateOrderChannelPost(c.orderId);
  await refundOfferStars(c.orderId, "bekor qilindi");
  if (actorId) {
    await logActivity(actorId, "CONTRACT_CANCEL_RESPOND", `Bekor qilishga rozi bo'ldi: «${c.order.title}»`, {
      orderId: c.orderId,
      contractId: c.id,
    });
  }
  await logToGroup(
    "contracts",
    actorId ? "📄 Shartnoma kelishib bekor qilindi" : "⏱ Javobsiz — shartnoma bekor qilindi",
    groupLines(c, [`Qaytarildi: ${som(c.amount)}`]),
    adminUrl(c.orderId),
  );
  return OK;
}

async function rejectCancel(c: ContractFull, me: string, reason: string): Promise<FlowResult> {
  const upd = await db.contract.updateMany({
    where: { id: c.id, status: "ACCEPTED", cancelState: "PENDING" },
    data: { cancelState: "DISPUTED", cancelRejectReason: reason },
  });
  if (upd.count !== 1) return STALE;
  await notice(
    c,
    `🚫 ${roleName(c, me)} bekor qilishga rozi bo'lmadi.\nSabab: ${reason}\n\n` +
      `Masala administratorga yuborildi — u bekor qilish, davom ettirish yoki yakunlash bo'yicha qaror qabul qiladi.`,
    me,
  );
  await logActivity(me, "CONTRACT_CANCEL_RESPOND", `Bekor qilishga rozi bo'lmadi: «${c.order.title}» — ${reason}`, {
    orderId: c.orderId,
    contractId: c.id,
  });
  await logToGroup(
    "contracts",
    "⚖️ NIZO — admin qarori kerak",
    groupLines(c, [
      `So'ragan: ${roleName(c, c.cancelRequestedById ?? "")}`,
      `Bekor qilish sababi: ${c.cancelReason ?? "—"}`,
      `Rad etish sababi: ${reason}`,
    ]),
    adminUrl(c.orderId),
  );
  return OK;
}

async function withdrawCancel(c: ContractFull, me: string): Promise<FlowResult> {
  const upd = await db.contract.updateMany({
    where: { id: c.id, status: "ACCEPTED", cancelState: "PENDING", cancelRequestedById: me },
    data: { cancelState: null, cancelDueAt: null },
  });
  if (upd.count !== 1) return STALE;
  await notice(c, "↩️ Bekor qilish so'rovi qaytarib olindi. Ish davom etadi.", me);
  return OK;
}

// ---------------------------------------------------------------- umumiy kirish nuqtasi

export type ContractAction =
  | { action: "ACCEPT" | "DECLINE" | "CANCEL" }
  | { action: "REQUEST_CANCEL"; reason: string }
  | { action: "APPROVE_CANCEL" }
  | { action: "REJECT_CANCEL"; reason: string }
  | { action: "WITHDRAW_CANCEL" };

export async function contractAction(contractId: string, me: string, input: ContractAction): Promise<FlowResult> {
  await sweepContracts({ contractId });
  const c = await loadContract(contractId);
  if (!c) return fail("Topilmadi", 404);
  const isParty = c.ordererId === me || c.preparerId === me;
  if (!isParty) return fail("Ruxsat yo'q", 403);

  if (c.status === "SENT") {
    if (input.action === "ACCEPT" || input.action === "DECLINE" || input.action === "CANCEL") {
      return handleSent(c, me, input.action);
    }
    return fail("Shartnoma hali imzolanmagan");
  }

  if (c.status !== "ACCEPTED" || !ACTIVE_ORDER.includes(c.order.status)) {
    return fail("Shartnoma allaqachon hal qilingan");
  }

  switch (input.action) {
    case "CANCEL":
      return fail(
        "Imzolangan shartnomani bir tomonlama bekor qilib bo'lmaydi — «Bekor qilishni so'rash» orqali ikkinchi tomonga so'rov yuboring",
      );
    case "REQUEST_CANCEL":
      return requestCancel(c, me, input.reason);
    case "APPROVE_CANCEL":
      if (c.cancelState !== "PENDING") return fail("Faol bekor qilish so'rovi yo'q");
      if (c.cancelRequestedById === me) return fail("O'z so'rovingizga javob bera olmaysiz");
      return approveCancel(c, me);
    case "REJECT_CANCEL":
      if (c.cancelState !== "PENDING") return fail("Faol bekor qilish so'rovi yo'q");
      if (c.cancelRequestedById === me) return fail("O'z so'rovingizga javob bera olmaysiz");
      return rejectCancel(c, me, input.reason);
    case "WITHDRAW_CANCEL":
      return withdrawCancel(c, me);
    default:
      return fail("Noto'g'ri amal");
  }
}

// ---------------------------------------------------------------- topshirish / yakunlash / qayta ishlash

export async function deliverWork(orderId: string, me: string): Promise<FlowResult> {
  await sweepContracts({ orderId });
  const c = await activeContractOf(orderId);
  if (!c) return fail("Faol shartnoma yo'q");
  if (c.preparerId !== me) return fail("Ruxsat yo'q", 403);
  if (c.order.status !== "IN_PROGRESS") return fail("Ish allaqachon topshirilgan");
  if (c.cancelState === "DISPUTED") return fail("Masala admin ko'rib chiqmoqda");

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
    `📦 Ish topshirildi. Buyurtma sahifasida tekshirib: «Yakunlash», «Qayta ishlash» yoki «Bekor qilishni so'rash»ni tanlang.\n` +
      `${shortDateTime(due)} gacha javob bo'lmasa, ish muvaffaqiyatli deb topiladi va ${som(c.amount)} tayyorlovchiga o'tadi.`,
    me,
  );
  await updateOrderChannelPost(orderId);
  await logActivity(me, "ORDER_DELIVER", `Ishni topshirdi: «${c.order.title}»`, { orderId });
  await logToGroup("orders", "📦 Ish topshirildi", [`«${c.order.title}»`, `Tekshiruv muddati: ${shortDateTime(due)}`, `Buyurtma ID: ${orderId}`], adminUrl(orderId));
  return OK;
}

export async function finalizeWork(orderId: string, me: string): Promise<FlowResult> {
  await sweepContracts({ orderId });
  const c = await activeContractOf(orderId);
  if (!c) return fail("Faol shartnoma yo'q");
  if (c.ordererId !== me) return fail("Faqat buyurtma egasi yakunlaydi", 403);
  if (c.cancelState === "DISPUTED") return fail("Masala admin ko'rib chiqmoqda");

  const ok = await runTx((tx) => payoutTx(tx, c, `Ish yakunlandi: ${c.order.title} (komissiyasiz, to'liq)`));
  if (!ok) return STALE;

  await notice(c, `🎉 Buyurtma yakunlandi. ${som(c.amount)} to'liq tayyorlovchi hisobiga o'tkazildi.`, me);
  await updateOrderChannelPost(orderId);
  await logActivity(me, "ORDER_FINALIZE", `Ishni yakunladi: «${c.order.title}» — tayyorlovchiga ${som(c.amount)}`, {
    orderId,
    payout: c.amount,
  });
  await logToGroup("completed", "✅ Ish yakunlandi", groupLines(c, [`Tayyorlovchiga: ${som(c.amount)}`]), adminUrl(orderId));
  return OK;
}

export async function requestRevision(orderId: string, me: string, reason: string, deadline: Date): Promise<FlowResult> {
  await sweepContracts({ orderId });
  const c = await activeContractOf(orderId);
  if (!c) return fail("Faol shartnoma yo'q");
  if (c.ordererId !== me) return fail("Ruxsat yo'q", 403);
  if (c.order.status !== "DELIVERED") return fail("Ish hali topshirilmagan");
  if (c.cancelState) return fail("Avval bekor qilish so'rovini hal qiling");
  if (deadline.getTime() <= Date.now() + 30 * 60 * 1000) {
    return fail("Yangi muddat kamida 30 daqiqadan keyin bo'lsin");
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
    `🔁 Buyurtmachi ishni qayta ishlashga qaytardi.\nSabab: ${reason}\nYangi muddat: ${shortDateTime(deadline)}.`,
    me,
  );
  await updateOrderChannelPost(orderId);
  await logActivity(me, "ORDER_REVISION", `Qayta ishlashga qaytardi: «${c.order.title}» — ${reason}`, { orderId });
  await logToGroup(
    "orders",
    "🔁 Qayta ishlashga qaytarildi",
    [`«${c.order.title}»`, `Sabab: ${reason}`, `Yangi muddat: ${shortDateTime(deadline)}`, `Buyurtma ID: ${orderId}`],
    adminUrl(orderId),
  );
  return OK;
}

/** Hali hech kim bilan shartnoma imzolanmagan (OPEN) buyurtmani bekor qilish. */
export async function cancelOpenOrder(orderId: string, me: string): Promise<FlowResult> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("Topilmadi", 404);
  if (order.ordererId !== me) return fail("Ruxsat yo'q", 403);
  if (order.status !== "OPEN") {
    return fail("Shartnoma imzolangan buyurtmani bekor qilish uchun «Bekor qilishni so'rash»dan foydalaning");
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
        data: { userId: s.ordererId, type: "REFUND", amount: s.amount, method: "ESCROW", note: "Buyurtma bekor qilindi — bloklangan mablag' qaytdi" },
      });
    }
  });
  if (!ok) return STALE;
  for (const s of sent) await notice(s, "📄 Buyurtma bekor qilindi — yuborilgan shartnoma ham bekor bo'ldi.", me);
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
    ? "Imzolangan shartnoma bor — buyurtmani o'chirib yoki bir tomonlama bekor qilib bo'lmaydi. «Bekor qilishni so'rash»dan foydalaning."
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
  if (c.status !== "ACCEPTED" || !ACTIVE_ORDER.includes(c.order.status)) return fail("Shartnoma faol emas");
  const extra = { disputeResolution: decision, disputeNote: note, disputeResolvedAt: new Date() };

  if (decision === "CANCEL") {
    const ok = await runTx((tx) => refundTx(tx, c, "Admin qarori: shartnoma bekor qilindi — mablag' qaytdi", extra));
    if (!ok) return STALE;
    await notice(c, `⚖️ Administrator qarori: shartnoma bekor qilindi. ${som(c.amount)} buyurtmachiga qaytarildi.\nIzoh: ${note}`, null);
    await refundOfferStars(c.orderId, "bekor qilindi");
  } else if (decision === "COMPLETE") {
    const ok = await runTx((tx) => payoutTx(tx, c, `Admin qarori: ish yakunlandi — ${c.order.title}`, extra));
    if (!ok) return STALE;
    await notice(c, `⚖️ Administrator qarori: ish muvaffaqiyatli yakunlandi. ${som(c.amount)} tayyorlovchiga o'tkazildi.\nIzoh: ${note}`, null);
  } else {
    const dl = newDeadline ?? effectiveDeadline(c, c.order);
    if (!dl || dl.getTime() <= Date.now()) return fail("Davom ettirish uchun kelajakdagi yangi muddatni belgilang");
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
    await notice(c, `⚖️ Administrator qarori: shartnoma davom etadi. Muddat: ${shortDateTime(dl)}.\nIzoh: ${note}`, null);
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
        await approveCancel(c, null);
        continue;
      }
      if (c.order.status === "IN_PROGRESS") {
        const dl = effectiveDeadline(c, c.order);
        if (!dl || dl > now) continue;
        const ok = await runTx((tx) =>
          refundTx(tx, c, "Shartnoma muddati tugadi, ish topshirilmadi — mablag' qaytdi"),
        );
        if (!ok) continue;
        await notice(
          c,
          `⏱ Shartnoma muddati (${shortDateTime(dl)}) tugadi, ish topshirilmadi. Shartnoma bekor qilindi, ${som(c.amount)} buyurtmachiga qaytarildi.`,
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
          await payoutTx(tx, c, `Ish topshirilgan, tekshiruv muddati tugadi — avtomatik yakunlandi: ${c.order.title}`);
        });
        if (!ok) continue;
        await notice(
          c,
          `⏱ Tekshiruv muddati tugadi — ish muvaffaqiyatli deb topildi. ${som(c.amount)} tayyorlovchiga o'tkazildi.`,
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
