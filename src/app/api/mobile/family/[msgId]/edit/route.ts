import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { familyInclude, familyRole, familySignal, parseMentions, toFamilyClients } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ body: z.string().trim().min(1).max(4000) });

/** O'z xabarini tahrirlash (matn). Oldingi matn admin panel uchun saqlanadi; bildirishnoma qayta yuborilmaydi. */
export async function POST(req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;
  const { msgId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Matn bölişi kerak" }, { status: 400 });
  const restriction = await getRestriction(me);
  if (restriction) return mobileJson({ error: restrictionText(restriction) }, { status: 403 });

  const m = await db.familyMessage.findUnique({ where: { id: msgId }, select: { senderId: true, body: true, deletedAt: true } });
  if (!m || m.deletedAt) return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });
  if (m.senderId !== me) return mobileJson({ error: "Faqat öz xabaringizni tahrirlay olasiz" }, { status: 403 });
  if (m.body === parsed.data.body) return mobileJson({ error: "Özgariş yöq" }, { status: 400 });

  const row = await db.familyMessage.update({
    where: { id: msgId },
    data: {
      body: parsed.data.body,
      editedAt: new Date(),
      editHistory: { push: m.body },
      mentions: await parseMentions(parsed.data.body),
    },
    include: familyInclude,
  });
  const { isAdmin } = await familyRole(me);
  const [pub] = await toFamilyClients([row]);
  familySignal("upd", { id: row.id, m: pub });
  const [mine] = await toFamilyClients([row], { meId: me, viewerIsAdmin: isAdmin });
  return mobileJson({ message: mine });
}
