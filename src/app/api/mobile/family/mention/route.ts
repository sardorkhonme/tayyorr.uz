import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { displayName, familyAuthors, type FamilyAuthor } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** @ yozilganda: bo'sh — Tayyorr.uz va Tayyorr Support; harf yozilsa — mos akkauntlar (eng ko'pi 3 ta). */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().replace(/^@/, "").toLowerCase().slice(0, 40);
  const { brand, support } = await familyAuthors();
  if (!q) return mobileJson({ users: [brand, support] });

  const special = [brand, support].filter((a) => a.login!.startsWith(q) || a.name.toLowerCase().startsWith(q));
  const rows = await db.user.findMany({
    where: {
      isSupport: false,
      isPlatform: false,
      login: { not: null },
      NOT: { id: auth.userId },
      OR: [
        { login: { startsWith: q, mode: "insensitive" } },
        { firstName: { startsWith: q, mode: "insensitive" } },
        { lastName: { startsWith: q, mode: "insensitive" } },
      ],
    },
    orderBy: { lastSeenAt: { sort: "desc", nulls: "last" } },
    take: 3,
    select: { id: true, name: true, firstName: true, lastName: true, login: true, avatarUrl: true, image: true },
  });
  const users: FamilyAuthor[] = rows.map((u) => ({
    kind: "user",
    id: u.id,
    name: displayName(u),
    login: u.login,
    image: u.avatarUrl ?? u.image ?? null,
  }));
  return mobileJson({ users: [...special, ...users].slice(0, 3) });
}
