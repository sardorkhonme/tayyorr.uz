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
  action: z.enum(["PAID", "REJECT"]),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
  }
  const { action, note } = parsed.data;
  // rad etishda sabab majburiy — foydalanuvchi nega rad etilganini bilishi kerak
  if (action === "REJECT" && (!note || note.length < 3)) {
    return NextResponse.json({ error: "Rad etish sababini yozing" }, { status: 400 });
  }

  const p = await db.payoutRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: { login: true, name: true, firstName: true, lastName: true, email: true, walletCode: true },
      },
    },
  });
  if (!p) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (p.status !== "PENDING") {
    return NextResponse.json({ error: "Allaqachon hal qilingan" }, { status: 400 });
  }

  // holat shartli o'zgaradi — ikki marta bosilsa ham pul ikki marta qaytmaydi
  const ALREADY = "ALREADY_RESOLVED";
  try {
  if (action === "PAID") {
    await db.$transaction(async (tx) => {
      const upd = await tx.payoutRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "PAID", resolvedAt: new Date(), adminNote: note || null },
      });
      if (upd.count !== 1) throw new Error(ALREADY);
      await tx.walletTransaction.updateMany({
        where: {
          userId: p.userId,
          type: "PAYOUT",
          status: "PENDING",
          meta: { path: ["payoutId"], equals: id },
        },
        data: { status: "SUCCESS" },
      });
    });
  } else {
    await db.$transaction(async (tx) => {
      const upd = await tx.payoutRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "REJECTED", resolvedAt: new Date(), adminNote: note || null },
      });
      if (upd.count !== 1) throw new Error(ALREADY);
      await tx.user.update({
        where: { id: p.userId },
        data: { balance: { increment: p.amount } },
      });
      await tx.walletTransaction.updateMany({
        where: {
          userId: p.userId,
          type: "PAYOUT",
          status: "PENDING",
          meta: { path: ["payoutId"], equals: id },
        },
        data: { status: "FAILED", reversedAt: new Date() },
      });
      await tx.walletTransaction.create({
        data: {
          userId: p.userId,
          type: "REFUND",
          amount: p.amount,
          method: "CARD",
          note: `Yechib olish rad etildi${note ? `: ${note}` : ""}`,
        },
      });
    });
  }
  } catch (e) {
    if (e instanceof Error && e.message === ALREADY) {
      return NextResponse.json({ error: "Allaqachon hal qilingan" }, { status: 400 });
    }
    throw e;
  }

  // foydalanuvchiga support xabari + push
  const supportId = await getSupportUserId();
  const conv = await getOrCreateConversation(supportId, p.userId);
  const body =
    action === "PAID"
      ? `💳 ${p.amount.toLocaleString("ru-RU")} so'm kartangizga o'tkazildi.`
      : `💳 ${p.amount.toLocaleString("ru-RU")} so'm yechib olish so'rovi rad etildi, mablag' hisobingizga qaytarildi.${note ? ` Sabab: ${note}` : ""}`;
  const msg = await createMessage({
    conversationId: conv.id,
    senderId: supportId,
    body: withSource(body, "ikkalasi"), // pul haqida — ikkala platformada
    system: false, // support xabari — oddiy bubble
  });
  await deliverMessage(msg);

  await logToGroup(
    "payouts",
    action === "PAID" ? "🏧 Pul o'tkazildi" : "🏧 Yechish rad etildi",
    [
      `Foydalanuvchi: ${userLabel(p.user)}`,
      p.user.email ? `Email: ${p.user.email}` : "",
      p.user.walletCode ? `Hisob kodi: ${p.user.walletCode}` : "",
      `Summa: ${p.amount.toLocaleString("ru-RU")} so'm`,
      `Karta: ${p.card}`,
      p.cardName ? `Karta egasi: ${p.cardName}` : "",
      note ? `Izoh: ${note}` : "",
      `So'rov ID: ${p.id}`,
      `Foydalanuvchi ID: ${p.userId}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/users/${p.userId}`),
  );

  return NextResponse.json({ ok: true });
}
