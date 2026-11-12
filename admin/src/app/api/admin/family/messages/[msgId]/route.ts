import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendFamilyPush } from "@/lib/fcm";
import { FAMILY_NAME, familyInclude, familySignal, toFamilyClients } from "@/lib/family";
import { getSupportUserId } from "@/lib/support";

/** Admin: xabarni o'chirish (ilovada yo'qoladi, admin panelda «öçirilgan» bo'lib qoladi). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { msgId } = await params;

  const m = await db.familyMessage.findUnique({ where: { id: msgId }, select: { deletedAt: true } });
  if (!m || m.deletedAt) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  const me = await getSupportUserId();
  const row = await db.familyMessage.update({
    where: { id: msgId },
    data: { deletedAt: new Date(), deletedById: me, pinnedAt: null },
    include: familyInclude,
  });
  familySignal("del", { id: msgId });
  const [out] = await toFamilyClients([row], { forAdmin: true, noSeen: true });
  return NextResponse.json({ message: out });
}

const pinSchema = z.object({ pinned: z.boolean(), notify: z.boolean().optional() });

/** Admin: qadash / qadashdan olish; `notify` — hammaga bildirishnoma. */
export async function PATCH(req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { msgId } = await params;

  const parsed = pinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri sörov" }, { status: 400 });

  const exists = await db.familyMessage.findUnique({ where: { id: msgId }, select: { deletedAt: true, sendAt: true } });
  if (!exists || exists.deletedAt || exists.sendAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }
  const row = await db.familyMessage.update({
    where: { id: msgId },
    data: { pinnedAt: parsed.data.pinned ? new Date() : null },
    include: familyInclude,
  });
  const [pub] = await toFamilyClients([row]);
  familySignal("upd", { id: row.id, m: pub });
  if (parsed.data.pinned && parsed.data.notify) {
    const me = await getSupportUserId();
    const text = row.body.trim() || (row.fileName ? `📎 ${row.fileName}` : "xabar");
    await sendFamilyPush(
      "all",
      { title: `${FAMILY_NAME} — qadaldi`, body: `${pub.author.name}: ${text.slice(0, 140)}`, messageId: row.id, kind: "pin" },
      me,
    ).catch(() => {});
  }
  const [out] = await toFamilyClients([row], { forAdmin: true });
  return NextResponse.json({ message: out });
}
