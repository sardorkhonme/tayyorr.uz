import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { familyRole, familySignal } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(200) });

/** Bir nechta xabarni bittada öçiriş — yakka DELETE qoidasi: öz xabari yoki admin — istalganini. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri sörov" }, { status: 400 });
  const ids = [...new Set(parsed.data.ids)];

  const rows = await db.familyMessage.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, senderId: true },
  });
  if (rows.length !== ids.length) return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });
  if (rows.some((m) => m.senderId !== me) && !(await familyRole(me)).isAdmin) {
    return mobileJson({ error: "Faqat öz xabaringizni öçira olasiz" }, { status: 403 });
  }

  const now = new Date();
  await db.$transaction(
    rows.map((m) => db.familyMessage.update({ where: { id: m.id }, data: { deletedAt: now, deletedById: me, pinnedAt: null } })),
  );
  for (const m of rows) familySignal("del", { id: m.id });
  return mobileJson({ ok: true, ids: rows.map((m) => m.id) });
}
