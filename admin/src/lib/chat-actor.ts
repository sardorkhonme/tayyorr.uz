import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { getConversationForUser } from "@/lib/chat";
import { getSupportUserId } from "@/lib/support";

/**
 * Chat API'larini kim chaqiryapti. Odatda — kirgan foydalanuvchi.
 * `?as=support` va admin sessiyasi bo'lsa — "tayyorr.uz support" nomidan
 * (admin panelidagi chat oddiy foydalanuvchi chati bilan bir xil ishlashi uchun).
 */
export async function chatActor(req: Request): Promise<{ id: string; support: boolean } | null> {
  if (new URL(req.url).searchParams.get("as") === "support") {
    if (!(await isAdmin())) return null;
    return { id: await getSupportUserId(), support: true };
  }
  const session = await auth();
  return session?.user?.id ? { id: session.user.id, support: false } : null;
}

/** Suhbat a'zoligini tekshiradi. Support uchun — foydalanuvchi o'chirgan/yashirilgan suhbat ham ochiladi. */
export async function conversationForActor(convId: string, actor: { id: string; support: boolean }) {
  if (!actor.support) return getConversationForUser(convId, actor.id);
  const conv = await db.conversation.findUnique({ where: { id: convId } });
  if (!conv || (conv.userAId !== actor.id && conv.userBId !== actor.id)) return null;
  return conv;
}
