import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { withSource } from "@/lib/message-source";

const schema = z.object({
  direction: z.enum(["ADD", "SUBTRACT"]),
  currency: z.enum(["SOM", "STAR"]).default("SOM"),
  amount: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
  notify: z.boolean().default(true),
});

/** Admin foydalanuvchi balansiga (so'm yoki star) istalgan miqdorda qo'shadi/ayiradi, sababi bilan. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Maʼlumot notöğri" },
      { status: 400 },
    );
  }
  const { direction, currency, amount, reason, notify } = parsed.data;
  const positive = direction === "ADD";
  const delta = positive ? amount : -amount;
  const isStar = currency === "STAR";

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, login: true, name: true, firstName: true, lastName: true, email: true, walletCode: true },
  });
  if (!user) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  if (isStar) {
    const current = await db.user.findUnique({ where: { id }, select: { starBalance: true } });
    if (!positive && (current?.starBalance ?? 0) < amount) {
      return NextResponse.json({ error: "Foydalanuvçida yetarli star yöq" }, { status: 400 });
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: isStar
        ? { starBalance: { increment: delta } }
        : { balance: { increment: delta } },
      select: { balance: true, starBalance: true },
    });
    if (!isStar) {
      await tx.walletTransaction.create({
        data: {
          userId: id,
          type: positive ? "TRANSFER_IN" : "TRANSFER_OUT",
          amount,
          method: "ADMIN",
          note: reason,
        },
      });
    }
    return u;
  });

  if (notify) {
    const supportId = await getSupportUserId();
    const conv = await getOrCreateConversation(supportId, id);
    const msg = await createMessage({
      conversationId: conv.id,
      senderId: supportId,
      body: isStar
        ? `⭐ Hisobingiz${positive ? "ga" : "dan"} ${amount} star ` +
          `${positive ? "qöşildi" : "ayirildi"}.\n\nSabab: ${reason}`
        : // hamyon umumiy — xabar tayyorr.uz va tayyorr+ da ko'rinadi
          withSource(
            `💰 Hisobingiz${positive ? "ga" : "dan"} ${amount.toLocaleString("ru-RU")} söm ` +
              `${positive ? "qöşildi" : "ayirildi"}.\n\nSabab: ${reason}`,
            "ikkalasi",
          ),
      system: false,
      action: { url: "/wallet", label: "Hisobni köriş" },
    });
    await deliverMessage(msg);
  }

  await logToGroup(
    isStar ? "stars" : "payments",
    isStar
      ? positive
        ? "➕ Admin star qöşdi"
        : "➖ Admin star ayirdi"
      : positive
        ? "➕ Admin balans qöşdi"
        : "➖ Admin balans ayirdi",
    [
      `Foydalanuvçi: ${userLabel(user)}`,
      user.email ? `Email: ${user.email}` : "",
      user.walletCode ? `Hisob kodi: ${user.walletCode}` : "",
      isStar
        ? `Summa: ${amount} ⭐`
        : `Summa: ${amount.toLocaleString("ru-RU")} söm`,
      isStar
        ? `Yangi star balansi: ${updated.starBalance} ⭐`
        : `Yangi balans: ${updated.balance.toLocaleString("ru-RU")} söm`,
      `Sabab: ${reason}`,
      `Foydalanuvçiga xabar yuborildi: ${notify ? "ha" : "yöq"}`,
      `Foydalanuvçi ID: ${user.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/users/${user.id}`),
  );

  return NextResponse.json({ ok: true });
}
