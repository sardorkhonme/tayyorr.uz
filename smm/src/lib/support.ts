import { db } from "@/lib/db";
import { sendPlusPush } from "@/lib/push";
import { notifyAdmins } from "@/lib/telegram";

/**
 * Support chati — tayyorr.uz dagi "tayyorr.uz support" hisobi bilan bitta suhbat
 * (admin paneldagi "Xabarlar" bo'limida ko'rinadi va javob shu yerdan beriladi).
 * Platformalar ajratilgan (belgi xabar boshida, foydalanuvchiga ko'rsatilmaydi):
 *   "[tayyorr+]" — faqat tayyorr+ da ko'rinadi (SMM, buyurtmalar, shu yerdan yozilganlar)
 *   "[all]"      — ikkala platformada (hisob / pul haqida)
 *   belgisiz     — faqat tayyorr.uz da
 * tayyorr.uz tomoni: src/lib/message-source.ts.
 */
export const SOURCE_TAG = "[tayyorr+]";
export const ALL_TAG = "[all]";
/** tayyorr+ da ko'rinadigan xabarlar */
const VISIBLE_HERE = { OR: [{ body: { startsWith: SOURCE_TAG } }, { body: { startsWith: ALL_TAG } }] };
const SUPPORT_NAME = "tayyorr.uz support";
const ADMIN_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://tayyorr.uz") + "/sardorxon/admin";

let cachedId: string | null = null;

/** tayyorr.uz dagi src/lib/support.ts bilan bir xil. */
async function getSupportUserId() {
  if (cachedId) return cachedId;
  const existing = await db.user.findFirst({ where: { isSupport: true }, select: { id: true } });
  if (existing) return (cachedId = existing.id);
  const created = await db.user.create({
    data: { isSupport: true, name: SUPPORT_NAME, login: "tayyorr_support" },
    select: { id: true },
  });
  return (cachedId = created.id);
}

async function getConversation(userId: string, create: boolean) {
  const supportId = await getSupportUserId();
  const [userAId, userBId] = userId < supportId ? [userId, supportId] : [supportId, userId];
  const existing = await db.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (existing || !create) return { conv: existing, supportId };
  const conv = await db.conversation
    .create({ data: { userAId, userBId } })
    .catch(() => db.conversation.findUniqueOrThrow({ where: { userAId_userBId: { userAId, userBId } } }));
  return { conv, supportId };
}

export type SupportMessage = { id: string; mine: boolean; body: string; createdAt: string };

const stripTag = (body: string) => body.replace(/^\[(tayyorr\+|all)\]\s*/, "");

/** Suhbat tarixi (oxirgi 60 ta) + support javoblarini o'qilgan deb belgilash. */
export async function listSupportMessages(userId: string, markRead: boolean) {
  const { conv, supportId } = await getConversation(userId, false);
  if (!conv || conv.hiddenFromUsersAt) {
    return { messages: [] as SupportMessage[], unread: 0, latest: null as string | null };
  }

  const rows = await db.message.findMany({
    where: { conversationId: conv.id, deletedAt: null, ...VISIBLE_HERE },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, senderId: true, body: true, createdAt: true, readAt: true, fileName: true },
  });
  const unreadRows = rows.filter((m) => m.senderId === supportId && !m.readAt);
  const unread = unreadRows.length;
  // eng yangi o'qilmagan javob — bildirishnoma (toast) uchun
  const latest = unreadRows[0] ? stripTag(unreadRows[0].body).slice(0, 140) || "Yangi xabar" : null;
  if (markRead && unread) {
    await db.message.updateMany({
      where: { conversationId: conv.id, senderId: supportId, readAt: null, ...VISIBLE_HERE },
      data: { readAt: new Date() },
    });
  }
  return {
    unread: markRead ? 0 : unread,
    latest: markRead ? null : latest,
    messages: rows.reverse().map((m) => ({
      id: m.id,
      mine: m.senderId === userId,
      body: stripTag(m.body) || (m.fileName ? `📎 ${m.fileName}` : ""),
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Support nomidan foydalanuvchiga xabarnoma — faqat tayyorr+ da ko'rinadi (SMM buyurtmalari va h.k.). */
export async function sendSupportNotice(userId: string, text: string) {
  const { conv, supportId } = await getConversation(userId, true);
  const c = conv!;
  await db.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: { conversationId: c.id, senderId: supportId, body: `${SOURCE_TAG} ${text}` },
    });
    await tx.conversation.update({
      where: { id: c.id },
      data: { lastMessageAt: msg.createdAt, deletedByUsersAt: null },
    });
  });
  // sayt yopiq bo'lsa ham — brauzer bildirishnomasi
  await sendPlusPush(userId, { title: SUPPORT_NAME, body: text.slice(0, 140), url: "/support", tag: `plus-${c.id}` }).catch(() => {});
}

/** Foydalanuvchi support'ga yozadi — xabar tayyorr.uz admin paneliga boradi. */
export async function sendSupportMessage(userId: string, text: string) {
  const { conv } = await getConversation(userId, true);
  const c = conv!;
  const m = await db.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: { conversationId: c.id, senderId: userId, body: `${SOURCE_TAG} ${text}` },
    });
    await tx.conversation.update({
      where: { id: c.id },
      data: { lastMessageAt: msg.createdAt, deletedByUsersAt: null },
    });
    return msg;
  });

  const u = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, name: true, login: true, email: true },
  });
  const who = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || u?.name || (u?.login ? `@${u.login}` : "Foydalanuvchi");
  await notifyAdmins(
    "support",
    `💬 ${who} — tayyorr+ dan yozdi`,
    [text.length > 500 ? `${text.slice(0, 500)}…` : text, u?.login ? `@${u.login}` : u?.email ?? ""],
    { text: "Javob berish", href: `${ADMIN_URL}/messages/${c.id}` },
  );
  return { id: m.id, mine: true, body: text, createdAt: m.createdAt.toISOString() } satisfies SupportMessage;
}
