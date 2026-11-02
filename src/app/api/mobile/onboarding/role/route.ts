import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { ME_SELECT, serializeMe } from "@/lib/mobile-me";
import { chooseRole } from "@/lib/role-select";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ role: z.enum(["ORDERER", "PREPARER"]) });

/** Mobil: profili to'liq, lekin roli yo'q hisob (tayyorr+ dan) — faqat rol tanlash. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof Response) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Rolni tanlang" }, { status: 400 });

  const r = await chooseRole(auth.userId, parsed.data.role, "mobil ilova");
  if ("error" in r) return mobileJson({ error: r.error }, { status: r.status });

  const user = await db.user.findUniqueOrThrow({ where: { id: auth.userId }, select: ME_SELECT });
  return mobileJson({ user: serializeMe(user) });
}
