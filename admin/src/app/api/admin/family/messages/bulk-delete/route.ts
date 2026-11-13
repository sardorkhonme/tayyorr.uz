import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { db } from "@/lib/db";
import { familyInclude, familySignal, toFamilyClients } from "@/lib/family";
import { getSupportUserId } from "@/lib/support";

const schema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(200) });

/** Admin: bir nechta xabarni bittada öçiriş (ilovada yöqoladi, admin panelda «öçirilgan» bölib qoladi). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri sörov" }, { status: 400 });
  const ids = [...new Set(parsed.data.ids)];

  const found = await db.familyMessage.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } });
  if (found.length !== ids.length) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  const me = await getSupportUserId();
  const now = new Date();
  const rows = await db.$transaction(
    found.map((m) =>
      db.familyMessage.update({
        where: { id: m.id },
        data: { deletedAt: now, deletedById: me, pinnedAt: null },
        include: familyInclude,
      }),
    ),
  );
  for (const r of rows) familySignal("del", { id: r.id });
  const out = await toFamilyClients(rows, { forAdmin: true, noSeen: true });
  return NextResponse.json({ messages: out });
}
