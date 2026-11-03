import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

const schema = z.object({
  suspectId: z.string().optional(),
  orderId: z.string().optional(),
  messageId: z.string().optional(),
  body: z.string().trim().min(10).max(3000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Şikoyat matni qisqa" },
      { status: 400 },
    );
  }
  const { suspectId, orderId, messageId, body } = parsed.data;

  if (suspectId && suspectId === session.user.id) {
    return NextResponse.json(
      { error: "Özingiz ustidan şikoyat yozib bölmaydi" },
      { status: 400 },
    );
  }

  await db.complaint.create({
    data: {
      reporterId: session.user.id,
      suspectId: suspectId || null,
      orderId: orderId || null,
      messageId: messageId || null,
      body,
    },
  });

  await logActivity(
    session.user.id,
    "COMPLAINT_CREATE",
    `Şikoyat yubordi${messageId ? " (xabar ustidan)" : orderId ? " (buyurtma böyiça)" : ""}`,
    { suspectId: suspectId || null, orderId: orderId || null, messageId: messageId || null },
  );

  const [reporter, suspect] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
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
    "⚠️ Yangi şikoyat",
    [
      `Şikoyatçi: ${userLabel(reporter)}`,
      suspectId ? `Kimga qarşi: ${userLabel(suspect)}` : "",
      orderId ? `Buyurtma ID: ${orderId}` : "",
      messageId ? `Xabar ID: ${messageId}` : "",
      body,
    ].filter(Boolean),
    siteUrl("/sardorxon/admin/complaints"),
  );

  return NextResponse.json({ ok: true });
}
