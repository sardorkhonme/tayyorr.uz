import type { Message } from "@prisma/client";

import { db } from "@/lib/db";
import { publishToConversation } from "@/lib/chat-bus";
import { toSerializedMessage } from "@/lib/chat-messages";
import { sendTelegramToUser, siteUrl } from "@/lib/telegram-notify";
import { logToGroup } from "@/lib/telegram-log";
import { SUPPORT_NAME, getSupportUserId } from "@/lib/support";
import { sendMobilePush } from "@/lib/fcm";
import { sendPushToUser } from "@/lib/push";
import { platformsOf, splitSource, stripSource } from "@/lib/message-source";

const PLUS_URL = process.env.SMM_SITE_URL || "https://plus.tayyorr.uz";
const SMM_URL = (process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz").replace(/\/+$/, "");

function snippet(m: Message) {
  if (m.deletedAt) return "xabar";
  const body = stripSource(m.body);
  if (body) return body.length > 120 ? body.slice(0, 120) + "…" : body;
  if (m.fileName) return `📎 ${m.fileName}`;
  return "yangi xabar";
}

/**
 * Yangi xabar: real vaqt (SSE) + qabul qiluvchiga mobil push (FCM), web-push va Telegram.
 */
export async function deliverMessage(m: Message) {
  publishToConversation(m.conversationId, {
    type: "message",
    message: await toSerializedMessage(m),
  });

  const conv = await db.conversation.findUnique({
    where: { id: m.conversationId },
    select: { userAId: true, userBId: true },
  });
  if (!conv) return;

  const recipientId = conv.userAId === m.senderId ? conv.userBId : conv.userAId;
  if (!recipientId || recipientId === m.senderId) return;

  const sender = await db.user.findUnique({
    where: { id: m.senderId },
    select: { id: true, name: true, firstName: true, login: true, isSupport: true, avatarUrl: true, image: true },
  });
  const title = sender?.isSupport
    ? SUPPORT_NAME
    : sender?.name ||
      sender?.firstName ||
      (sender?.login ? `@${sender.login}` : "Yangi xabar");

  // tayyorr+ ga xos xabar — tayyorr.uz ilovasi/brauzeriga push yubormaymiz (u yerda ko'rinmaydi),
  // Telegram'dagi tugma tayyorr+ ni ochadi
  const source = splitSource(m.body).source;
  const ps = platformsOf(source);
  const onUz = ps.includes("uz");
  const plusOnly = !onUz && ps.includes("plus");
  const smmOnly = !onUz && !plusOnly;

  // tayyorr+ brauzer bildirishnomasi — faqat support xabari tayyorr+ / ikkalasiga bo'lsa
  if (sender?.isSupport && ps.includes("plus")) {
    await sendPushToUser(
      recipientId,
      { title: SUPPORT_NAME, body: snippet(m), url: "/support", tag: `plus-${m.conversationId}` },
      ["plus"],
    ).catch(() => {});
  }

  // mobil ilova (FCM) va brauzer (web-push) — xatosi xabar yuborishni to'xtatmasin
  if (onUz) await Promise.allSettled([
    sendMobilePush(recipientId, {
      title,
      body: snippet(m),
      conversationId: m.conversationId,
      // bildirishnoma bosilganda ilova suhbatni darhol shu ma'lumot bilan ochadi
      data: {
        otherId: m.senderId,
        name: title,
        login: sender?.login ?? "",
        image: sender?.avatarUrl ?? sender?.image ?? "",
        support: sender?.isSupport ? "1" : "0",
      },
    }),
    sendPushToUser(recipientId, {
      title,
      body: snippet(m),
      url: `/messages/${m.conversationId}`,
      tag: m.conversationId,
    }),
  ]);

  await sendTelegramToUser(recipientId, {
    title,
    body: snippet(m),
    url: plusOnly ? PLUS_URL : smmOnly ? SMM_URL : siteUrl(`/messages/${m.conversationId}`),
    buttonLabel: plusOnly ? "tayyorr+ da ko'rish" : smmOnly ? "Tayyorr SMM da ko'rish" : "Xabarni ko'rish",
  });

  // foydalanuvchi support'ga yozgan bo'lsa — admin loglar guruhiga ham tushadi
  const supportId = await getSupportUserId();
  if (recipientId === supportId && !sender?.isSupport) {
    await logToGroup(
      "support",
      `💬 ${title}`,
      [snippet(m)],
      siteUrl(`/sardorxon/admin/chats/${m.conversationId}`),
    );
  }
}
