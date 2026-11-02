import { db } from "@/lib/db";
import { getOrCreateConversation, createMessage } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";
import { getSupportUserId } from "@/lib/support";
import { sendTelegramMessage } from "@/lib/telegram-notify";
import { APP_URL } from "@/lib/site";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function sendSupportMessage(userId: string, body: string) {
  const supportId = await getSupportUserId();
  const conv = await getOrCreateConversation(supportId, userId);
  const msg = await createMessage({ conversationId: conv.id, senderId: supportId, body });
  await deliverMessage(msg);
}

async function askForEmail(chatId: string) {
  await sendTelegramMessage(
    chatId,
    "tayyorr.uz akkauntingizni ulash uchun ro'yxatdan o'tgan email manzilingizni yuboring.",
  );
}

/**
 * Botga kelgan har bir matnli xabarni akkaunt-ulash oqimi bo'yicha
 * qayta ishlaydi: email so'raladi -> kod tayyorr.uz support chatiga
 * yuboriladi -> foydalanuvchi kodni botga kiritadi -> ulanadi.
 */
export async function handleIncomingMessage(
  chatId: number,
  text: string,
  from: { first_name?: string; username?: string },
) {
  const chatIdStr = String(chatId);
  const trimmed = text.trim();

  if (trimmed === "/start" || trimmed === "/restart") {
    await db.telegramLinkSession.deleteMany({ where: { chatId: chatIdStr } });
    const already = await db.user.findFirst({
      where: { telegramChatId: chatIdStr },
      select: { name: true, firstName: true },
    });
    if (already) {
      await sendTelegramMessage(
        chatId,
        `Akkauntingiz allaqachon ulangan ✅ (${already.firstName || already.name || "tayyorr.uz"}). Qayta ulash uchun avval admin bilan bog'laning.`,
      );
      return;
    }
    await db.telegramLinkSession.create({ data: { chatId: chatIdStr } });
    await askForEmail(chatIdStr);
    return;
  }

  const session = await db.telegramLinkSession.findUnique({ where: { chatId: chatIdStr } });

  // hali sessiya yo'q — birinchi xabar
  if (!session) {
    const already = await db.user.findFirst({ where: { telegramChatId: chatIdStr } });
    if (already) {
      await sendTelegramMessage(chatId, "Akkauntingiz allaqachon ulangan ✅");
      return;
    }
    await db.telegramLinkSession.create({ data: { chatId: chatIdStr } });
    await askForEmail(chatIdStr);
    return;
  }

  // ---- 1-bosqich: email kutilmoqda ----
  if (!session.code) {
    if (!looksLikeEmail(trimmed)) {
      await sendTelegramMessage(
        chatId,
        "Bu email manzilga o'xshamayapti. Iltimos, tayyorr.uz'da ro'yxatdan o'tgan email manzilingizni to'liq kiriting.",
      );
      return;
    }
    const user = await db.user.findFirst({
      where: { email: { equals: trimmed, mode: "insensitive" }, isSupport: false, isPlatform: false },
      select: { id: true },
    });
    if (!user) {
      await sendTelegramMessage(
        chatId,
        "Bunday email bilan ro'yxatdan o'tgan akkaunt topilmadi. Iltimos, tayyorr.uz'dagi email manzilingizni tekshirib, qayta yuboring.",
      );
      return;
    }

    const code = generateCode();
    await db.telegramLinkSession.update({
      where: { chatId: chatIdStr },
      data: { userId: user.id, code, attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });

    await sendSupportMessage(
      user.id,
      `🔐 Tayyorr.uz kirish kodi: ${code}\n\nUshbu kodni Telegram botga kiriting. Kodni hech kimga bermang, uni faqat siz botga kiritishingiz kerak. 10 daqiqa amal qiladi.`,
    );

    await sendTelegramMessage(
      chatId,
      `Kod tayyorr.uz'dagi "Qo'llab-quvvatlash" chatingizga yuborildi.\n\n` +
        `Ko'rish: ${APP_URL}/messages\n\n` +
        "Kodni shu yerga kiriting.",
    );
    return;
  }

  // ---- 2-bosqich: kod kutilmoqda ----
  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await db.telegramLinkSession.deleteMany({ where: { chatId: chatIdStr } });
    await sendTelegramMessage(
      chatId,
      "Kod muddati tugadi. Qaytadan boshlash uchun /start bosing.",
    );
    return;
  }

  if (trimmed.replace(/\s/g, "") !== session.code) {
    const attempts = session.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await db.telegramLinkSession.deleteMany({ where: { chatId: chatIdStr } });
      await sendTelegramMessage(
        chatId,
        "Ko'p marta noto'g'ri kod kiritildi. Qaytadan boshlash uchun /start bosing.",
      );
      return;
    }
    await db.telegramLinkSession.update({ where: { chatId: chatIdStr }, data: { attempts } });
    await sendTelegramMessage(chatId, "Kod noto'g'ri. Qaytadan urinib ko'ring.");
    return;
  }

  // kod to'g'ri — ulaymiz
  const userId = session.userId!;

  // shu chatId boshqa akkauntda qolib ketgan bo'lsa — tozalaymiz
  await db.user.updateMany({
    where: { telegramChatId: chatIdStr, NOT: { id: userId } },
    data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
  });

  const user = await db.user.update({
    where: { id: userId },
    data: {
      telegramChatId: chatIdStr,
      telegramUsername: from.username || null,
      telegramLinkedAt: new Date(),
      telegramBlockedAt: null,
    },
    select: { name: true, firstName: true, login: true },
  });
  await db.telegramLinkSession.deleteMany({ where: { chatId: chatIdStr } });

  const displayName = user.firstName || user.name || (user.login ? `@${user.login}` : "");

  await sendTelegramMessage(
    chatId,
    `Salom${displayName ? `, ${displayName}` : ""}! Xush kelibsiz 🎉\n\n` +
      "Endi quyidagilarni shu yerdan bilib borasiz:\n" +
      "• Yangi xabarlar\n" +
      "• Buyurtmangizga yangi takliflar (ko'ngillilar)\n" +
      "• Shartnoma bilan bog'liq amallar\n" +
      "• To'lov va tranzaksiyalar\n\n" +
      "Savol bo'lsa, saytdagi \"Qo'llab-quvvatlash\" chatiga yozing.",
  );

  const tgIdentity = from.username
    ? `@${from.username}`
    : from.first_name || "Telegram foydalanuvchisi";
  await sendSupportMessage(
    userId,
    `✅ Akkauntingizga Telegram bot ulandi.\nUlangan hisob: ${tgIdentity}\n\n` +
      "Agar bu siz bo'lmasangiz, darhol shu chatga yozib shikoyat qoldiring.",
  );
}
