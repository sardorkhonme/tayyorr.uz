import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Shaxsiy referal havola + taklif qilinganlar ro'yxati — faqat tayyorlovchi. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const me = await db.user.findUnique({
    where: { id: auth.userId },
    select: {
      role: true,
      starBalance: true,
      referredUsers: {
        select: { id: true, login: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!me) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (me.role !== "PREPARER") {
    return mobileJson({ error: "Faqat tayyorlovçilar uçun" }, { status: 403 });
  }

  return mobileJson({
    starBalance: me.starBalance,
    referredUsers: me.referredUsers.map((u) => ({
      id: u.id,
      login: u.login,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
