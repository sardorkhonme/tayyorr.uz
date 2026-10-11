import { NextResponse, after } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { sweepContracts } from "@/lib/contract-flow";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { ME_SELECT, serializeMe } from "@/lib/mobile-me";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { birthDateSchema } from "@/lib/birthday";

export { OPTIONS } from "@/lib/mobile-cors";

/** Joriy foydalanuvchi profili (mobil ilova bosh ekrani uchun). */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  after(() => sweepContracts());
  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: ME_SELECT,
  });
  if (!user) return mobileJson({ error: "Topilmadi" }, { status: 404 });

  return mobileJson({ user: serializeMe(user) });
}

const patchSchema = z.object({
  // "YYYY-MM-DD" — profilda tahrirlanadi
  birthDate: birthDateSchema.optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  about: z.string().min(5).max(1000).optional(),
  avatarUrl: z.string().url().optional(),
});

/** Profilni tahrirlash — ism, familiya, o'zi haqida, profil rasmi. */
export async function PATCH(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const restriction = await getRestriction(auth.userId);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return mobileJson({ error: "O'zgartirish uchun maydon yo'q" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: auth.userId },
    data: {
      ...data,
      ...(data.firstName && data.lastName
        ? { name: `${data.firstName} ${data.lastName}` }
        : {}),
    },
    select: ME_SELECT,
  });

  await logActivity(auth.userId, "PROFILE_UPDATE", "Profilni tahrirladi (mobil ilova)");

  return mobileJson({ user: serializeMe(user) });
}
