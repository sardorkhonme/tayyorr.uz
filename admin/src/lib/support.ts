import { db } from "@/lib/db";

export const SUPPORT_NAME = "tayyorr.uz support";

let cachedId: string | null = null;

/** "tayyorr.uz support" tizim hisobini yaratadi/qaytaradi. */
export async function getSupportUserId(): Promise<string> {
  if (cachedId) return cachedId;

  const existing = await db.user.findFirst({
    where: { isSupport: true },
    select: { id: true },
  });
  if (existing) {
    cachedId = existing.id;
    return existing.id;
  }

  const created = await db.user.create({
    data: {
      isSupport: true,
      name: SUPPORT_NAME,
      login: "tayyorr_support",
    },
    select: { id: true },
  });
  cachedId = created.id;
  return created.id;
}
