import { db } from "@/lib/db";
import { getPlatformUserId } from "@/lib/platform";
import { sendTelegramToUser, siteUrl } from "@/lib/telegram-notify";
import { logToGroup, siteUrl as adminUrl } from "@/lib/telegram-log";
import { getSupportUserId } from "@/lib/support";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";

/** 1 star narxi (so'm). */
export const STAR_PRICE = 2_000;

/** Buyurtmaga taklif (ariza) yuborish uchun majburiy minimal star. */
export const MIN_OFFER_STARS = 2;

/**
 * Foydalanuvchi so'm hamyonidan star sotib oladi — bu YAGONA joy, qayerda
 * pul haqiqatan ham sayt hisobiga (platform) o'tadi. Sotib olingan starlar
 * `starBalance`ga tushadi va keyin ariza/navbat uchun bepul sarflanadi
 * ([[useStars]]) — ya'ni harid va sarflash ikki alohida qadam.
 */
export async function buyStars(opts: {
  userId: string;
  stars: number;
}): Promise<{ ok: true; newSom: number; newStars: number } | { ok: false; error: string }> {
  if (opts.stars <= 0 || !Number.isInteger(opts.stars)) {
    return { ok: false, error: "Star soni noto'g'ri" };
  }
  const amount = opts.stars * STAR_PRICE;

  const user = await db.user.findUnique({
    where: { id: opts.userId },
    select: { balance: true },
  });
  if (!user || user.balance < amount) {
    return {
      ok: false,
      error: `Hisobda yetarli mablag' yo'q. ${opts.stars} ⭐ = ${amount.toLocaleString("ru-RU")} so'm kerak.`,
    };
  }

  const platformId = await getPlatformUserId();

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: opts.userId },
      data: { balance: { decrement: amount }, starBalance: { increment: opts.stars } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: opts.userId,
        type: "SPEND",
        amount,
        method: "STAR",
        note: `${opts.stars} ⭐ sotib olindi`,
        meta: { stars: opts.stars },
      },
    });
    await tx.user.update({
      where: { id: platformId },
      data: { balance: { increment: amount } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: platformId,
        type: "COMMISSION",
        amount,
        method: "STAR",
        note: `Star sotildi — ${opts.stars} ⭐ (${opts.userId})`,
        meta: { stars: opts.stars, fromUserId: opts.userId },
      },
    });
    return u;
  });

  return { ok: true, newSom: updated.balance, newStars: updated.starBalance };
}

/**
 * Oldindan sotib olingan star balansidan sarflaydi (pul harakat qilmaydi —
 * pul allaqachon [[buyStars]] vaqtida sayt hisobiga o'tgan). Ariza yuborish
 * va navbatda yuqoriga chiqish shu orqali ishlaydi.
 */
export async function useStars(opts: {
  userId: string;
  stars: number;
}): Promise<{ ok: true; newStars: number } | { ok: false; error: string }> {
  if (opts.stars <= 0 || !Number.isInteger(opts.stars)) {
    return { ok: false, error: "Star soni noto'g'ri" };
  }

  const user = await db.user.findUnique({
    where: { id: opts.userId },
    select: { starBalance: true },
  });
  if (!user || user.starBalance < opts.stars) {
    const missing = opts.stars - (user?.starBalance ?? 0);
    return {
      ok: false,
      error: `Star yetarli emas — yana ${missing} ⭐ kerak. Avval hamyon bo'limidan star sotib oling.`,
    };
  }

  const updated = await db.user.update({
    where: { id: opts.userId },
    data: { starBalance: { decrement: opts.stars } },
  });

  return { ok: true, newStars: updated.starBalance };
}

/**
 * Buyurtma HECH KIM tomonidan bajarilmay bekor bo'lsa yoki o'chirilsa —
 * shu buyurtmaga taklif yuborgan barcha tayyorlovchilarning sarflagan
 * starlari qaytariladi (ular aybdor emas). Lekin buyurtma muvaffaqiyatli
 * yakunlansa (boshqa tayyorlovchi tomonidan bajarilsa ham) — starlar
 * QAYTARILMAYDI, chunki bu holatda navbat o'z vazifasini bajargan, faqat
 * boshqa tayyorlovchi tanlangan xolos.
 */
export async function refundOfferStars(orderId: string, reason: string) {
  const [order, offers] = await Promise.all([
    db.order.findUnique({ where: { id: orderId }, select: { title: true } }),
    db.offer.findMany({
      where: { orderId, starsSpent: { gt: 0 } },
      select: { id: true, preparerId: true, starsSpent: true },
    }),
  ]);
  if (offers.length === 0) return;

  const supportId = await getSupportUserId();
  let totalStars = 0;
  for (const o of offers) {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: o.preparerId },
        data: { starBalance: { increment: o.starsSpent } },
      });
      await tx.offer.update({ where: { id: o.id }, data: { starsSpent: 0 } });
    });
    totalStars += o.starsSpent;

    const text =
      `⭐ Staringiz qaytarildi. «${order?.title ?? "Buyurtma"}» ${reason} — ` +
      `sarflagan ${o.starsSpent} ⭐ staringiz hisobingizga qaytarildi.`;

    // saytdagi support chatiga — kafolatlangan bildirishnoma (Telegram
    // ulanmagan bo'lsa ham ko'radi)
    const conv = await getOrCreateConversation(supportId, o.preparerId);
    const msg = await createMessage({
      conversationId: conv.id,
      senderId: supportId,
      body: text,
      system: false,
    });
    await deliverMessage(msg);

    // shaxsiy Telegram boti ulangan bo'lsa — qo'shimcha
    await sendTelegramToUser(o.preparerId, {
      title: "⭐ Star qaytarildi",
      body: text,
      url: siteUrl("/wallet"),
      buttonLabel: "Hamyonni ko'rish",
    });
  }

  await logToGroup(
    "stars",
    "↩️ Starlar qaytarildi",
    [
      `«${order?.title ?? "Buyurtma"}»`,
      `Sabab: ${reason}`,
      `${offers.length} ta tayyorlovchiga jami ${totalStars} ⭐ qaytarildi`,
      `Buyurtma ID: ${orderId}`,
    ],
    adminUrl(`/sardorxon/admin/orders/${orderId}`),
  );
}
