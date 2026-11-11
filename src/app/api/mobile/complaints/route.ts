import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  suspectId: z.string().optional(),
  orderId: z.string().optional(),
  messageId: z.string().optional(),
  body: z.string().trim().min(10).max(3000),
});

/** Shikoyat yuborish — web /api/complaints bilan bir xil mantiq. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: parsed.error.issues[0]?.message ?? "Şikoyat matni qisqa" }, { status: 400 });
  }
  const { orderId, messageId, body } = parsed.data;
  let { suspectId } = parsed.data;
  // «Tayyorr's Family» xabari (anonim bo'lishi mumkin) — gumondor haqiqiy yozuvchi
  if (messageId && !suspectId) {
    const fm = await db.familyMessage.findUnique({ where: { id: messageId }, select: { senderId: true } }).catch(() => null);
    if (fm && fm.senderId !== me) suspectId = fm.senderId;
  }

  if (suspectId && suspectId === me) {
    return mobileJson({ error: "Özingiz ustidan şikoyat yozib bölmaydi" }, { status: 400 });
  }

  await db.complaint.create({
    data: {
      reporterId: me,
      suspectId: suspectId || null,
      orderId: orderId || null,
      messageId: messageId || null,
      body,
    },
  });

  await logActivity(
    me,
    "COMPLAINT_CREATE",
    `Şikoyat yubordi${messageId ? " (xabar ustidan)" : orderId ? " (buyurtma böyiça)" : ""} (mobil ilova)`,
    { suspectId: suspectId || null, orderId: orderId || null, messageId: messageId || null },
  );

  const [reporter, suspect] = await Promise.all([
    db.user.findUnique({
      where: { id: me },
      select: { login: true, name: true, firstName: true, lastName: true, email: true },
    }),
    suspectId
      ? db.user.findUnique({
          where: { id: suspectId },
          select: { login: true, name: true, firstName: true, lastName: true, email: true },
        })
      : Promise.resolve(null),
  ]);

  await logToGroup(
    "complaints",
    "⚠️ Yangi şikoyat (mobil)",
    [
      `Şikoyatçi: ${userLabel(reporter)}`,
      suspectId ? `Kimga qarşi: ${userLabel(suspect)}` : "",
      orderId ? `Buyurtma ID: ${orderId}` : "",
      messageId ? `Xabar ID: ${messageId}` : "",
      body,
    ].filter(Boolean),
    siteUrl("/sardorxon/admin/complaints"),
  );

  return mobileJson({ ok: true });
}
