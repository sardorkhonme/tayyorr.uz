import { db } from "@/lib/db";

/**
 * Sayt hisobi (singleton). Endi shartnomalardan komissiya olinmaydi —
 * pul to'liq (100%) tayyorlovchiga o'tadi. Sayt daromadi endi
 * star tizimidan keladi (bu hisobga o'sha mablag' tushadi — [[stars.ts]]).
 */
let cachedId: string | null = null;

export async function getPlatformUserId(): Promise<string> {
  if (cachedId) return cachedId;
  const existing = await db.user.findFirst({
    where: { isPlatform: true },
    select: { id: true },
  });
  if (existing) {
    cachedId = existing.id;
    return existing.id;
  }
  const created = await db.user.create({
    data: { isPlatform: true, name: "tayyorr.uz", login: "tayyorr_platform" },
    select: { id: true },
  });
  cachedId = created.id;
  return created.id;
}
