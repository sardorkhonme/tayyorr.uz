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

/** Ro'yxatdan o'tgach bir marta yuboriladigan xabarlar (xush kelibsiz + kanal). */
export async function sendWelcome(userId: string, firstName?: string | null) {
  const supportId = await getSupportUserId();
  const conv = await getOrCreateConversation(supportId, userId, null);
  const count = await db.message.count({ where: { conversationId: conv.id } });
  if (count > 0) return; // allaqachon yozilgan

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
