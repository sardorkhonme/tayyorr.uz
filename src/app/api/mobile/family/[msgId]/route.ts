import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { sendFamilyPush } from "@/lib/fcm";
import { FAMILY_NAME, authorOf, familyInclude, familyRole, familySignal, toFamilyClients } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** O'chirish: o'z xabari (rejalashtirilgani ham) yoki admin — istalganini. Admin panelda saqlanib qoladi. */
export async function DELETE(req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;
  const { msgId } = await params;

  const m = await db.familyMessage.findUnique({ where: { id: msgId }, select: { id: true, senderId: true, deletedAt: true } });
  if (!m || m.deletedAt) return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });
  if (m.senderId !== me && !(await familyRole(me)).isAdmin) {
    return mobileJson({ error: "Faqat öz xabaringizni öçira olasiz" }, { status: 403 });
  }
  await db.familyMessage.update({ where: { id: msgId }, data: { deletedAt: new Date(), deletedById: me, pinnedAt: null } });
  familySignal("del", { id: msgId });
  return mobileJson({ ok: true });
}

const pinSchema = z.object({ pinned: z.boolean(), notify: z.boolean().optional() });

/** Qadash / qadashdan olish — faqat admin; `notify` bo'lsa hammaga bildirishnoma. */
export async function PATCH(req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;
  const { msgId } = await params;
  if (!(await familyRole(me)).isAdmin) return mobileJson({ error: "Faqat admin qadaydi" }, { status: 403 });

  const parsed = pinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri sörov" }, { status: 400 });

  const exists = await db.familyMessage.findUnique({ where: { id: msgId }, select: { deletedAt: true, sendAt: true } });
  if (!exists || exists.deletedAt || exists.sendAt.getTime() > Date.now()) {
    return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });
  }
  const row = await db.familyMessage.update({
    where: { id: msgId },
    data: { pinnedAt: parsed.data.pinned ? new Date() : null },
    include: familyInclude,
  });
  const [m] = await toFamilyClients([row]);
  familySignal("upd", { id: row.id, m });
  if (parsed.data.pinned && parsed.data.notify) {
    const text = row.body.trim() || (row.fileName ? `📎 ${row.fileName}` : "xabar");
    await sendFamilyPush(
      "all",
      { title: `${FAMILY_NAME} — qadaldi`, body: `${authorOf(row).name}: ${text.slice(0, 140)}`, messageId: row.id, kind: "pin" },
      me,
    ).catch(() => {});
  }
  return mobileJson({ message: m });
}
