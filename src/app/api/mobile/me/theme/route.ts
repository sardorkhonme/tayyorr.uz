import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Yorug'/qorong'i rejimni saqlaydi — web /api/me/theme bilan bir xil. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { theme } = await req.json().catch(() => ({}));
  if (theme !== "light" && theme !== "dark") {
    return mobileJson({ error: "Notöğri" }, { status: 400 });
  }
  await db.user.update({ where: { id: auth.userId }, data: { theme } }).catch(() => {});
  return mobileJson({ ok: true });
}
