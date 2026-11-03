import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  login: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Login faqat harf, raqam, _ va . dan iborat")
    .optional(),
  newPassword: z.string().min(6).max(100).optional(),
});

/** Username (login) va parolni tahrirlash — web /api/me/account bilan bir xil mantiq. */
export async function PATCH(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const restriction = await getRestriction(auth.userId);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson(
      { error: parsed.error.issues[0]?.message ?? "Notöğri maʼlumot" },
      { status: 400 },
    );
  }
  const { login, newPassword } = parsed.data;
  const me = auth.userId;

  const data: Record<string, unknown> = {};

  if (login) {
    const clash = await db.user.findFirst({
      where: { login, NOT: { id: me } },
      select: { id: true },
    });
    if (clash) {
      return mobileJson({ error: "Bu login band" }, { status: 409 });
    }
    data.login = login;
  }

  if (newPassword) {
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return mobileJson({ error: "Özgariş yöq" }, { status: 400 });
  }

  const updated = await db.user.update({ where: { id: me }, data });

  const changed: string[] = [];
  if ("login" in data) changed.push(`login → @${login}`);
  if ("passwordHash" in data) changed.push("parol yangilandi");
  await logActivity(me, "ACCOUNT_UPDATE", `Hisob sozlamalari: ${changed.join(", ")} (mobil ilova)`);

  return mobileJson({ ok: true, login: updated.login });
}
