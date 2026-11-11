import { db } from "@/lib/db";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";
import { getSupportUserId } from "@/lib/support";

/** tayyorr.uz support nomidan foydalanuvchiga xabar yuboradi (real vaqt + push). */
export async function sendSupportMessage(
  userId: string,
  body: string,
  file?: { key: string; name: string; type: string; size: number } | null,
  broadcastId?: string | null,
) {
  const supportId = await getSupportUserId();
  const conv = await getOrCreateConversation(supportId, userId, null);
  const msg = await createMessage({
    conversationId: conv.id,
    senderId: supportId,
    body,
    system: false, // support xabari — oddiy bubble
    file: file ?? null,
    broadcastId: broadcastId ?? null,
  });
  await deliverMessage(msg);
  return conv.id;
}

const TELEGRAM_NEWS_URL = "https://t.me/tayyorruz";
const TELEGRAM_WORKS_URL = "https://t.me/tayyorruz_works";
/** Xush kelibsiz xabarining belgisi (eski va yangi alifboda bir xil qism). */
export const WELCOME_MARK = "kelibsiz 🎉";

/** Ro'yxatdan o'tgach bir marta yuboriladigan xabarlar (xush kelibsiz + kanal). */
export async function sendWelcome(userId: string, firstName?: string | null) {
  const supportId = await getSupportUserId();
  const conv = await getOrCreateConversation(supportId, userId, null);
  // allaqachon yuborilgan bo'lsa — qayta yo'q (çatda boshqa xabarlar bo'lishi mumkin)
  const sent = await db.message.findFirst({
    where: { conversationId: conv.id, senderId: supportId, body: { contains: WELCOME_MARK } },
    select: { id: true },
  });
  if (sent) return;

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isPreparer = me?.role === "PREPARER";

  const hi = firstName ? `Assalomu alaykum, ${firstName}!` : "Assalomu alaykum!";

  // 1-xabar — xush kelibsiz
  const m1 = await createMessage({
    conversationId: conv.id,
    senderId: supportId,
    body:
      `${hi} tayyorr.uz'ga xuş kelibsiz 🎉\n\n` +
      `Bu — tayyorr.uz support. Har qanday savol, muammo yoki taklif bölsa ` +
      `şu yerga yozing — yordam beramiz.`,
    system: false, // support xabari — oddiy bubble
  });
  await deliverMessage(m1);

  // 2-xabar — Telegram kanal
  const channelBody = isPreparer
    ? `📢 Yangi buyurtmalarni birinçilardan bölib köriş uçun Telegram kanalimizga qöşiling:\n${TELEGRAM_WORKS_URL}\n\n` +
      `Saytda eʼlon qilingan har bir yangi buyurtma öşa zahoti kanalga çiqadi — kanalda bölsangiz, işni boşqalardan oldin körib, birinçi bölib taklif yuborasiz.`
    : `📢 Platforma yangiliklari, aksiyalar va yangi imkoniyatlardan boxabar bölib turiş uçun Telegram kanalimizga obuna böling:\n${TELEGRAM_NEWS_URL}`;

  const m2 = await createMessage({
    conversationId: conv.id,
    senderId: supportId,
    body: channelBody,
    system: false,
  });
  await deliverMessage(m2);
}

/** Rol tanlagan, lekin xush kelibsiz xabarini olmagan foydalanuvchilar. */
export async function usersWithoutWelcome() {
  const supportId = await getSupportUserId();
  const welcomed = await db.message.findMany({
    where: { senderId: supportId, body: { contains: WELCOME_MARK } },
    select: { conversation: { select: { userAId: true, userBId: true } } },
  });
  const got = new Set<string>();
  for (const m of welcomed) {
    got.add(m.conversation.userAId);
    got.add(m.conversation.userBId);
  }
  const users = await db.user.findMany({
    where: { role: { not: null }, isSupport: false, isPlatform: false, login: { not: null } },
    select: { id: true, firstName: true },
    orderBy: { createdAt: "asc" },
  });
  return users.filter((u) => !got.has(u.id));
}
