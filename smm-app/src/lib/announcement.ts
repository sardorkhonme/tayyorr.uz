import { db } from "@/lib/db";

export type SmmAnn = { id: string; title: string; body: string; buttonText: string | null; buttonUrl: string | null };

/** Tayyorr SMM'dagi e'lon banneri: admin «Hammaga» yoki «Tayyorr SMM'da» deb qo'ygan faol e'lonlar. */
export async function getSmmAnnouncements(): Promise<SmmAnn[]> {
  const rows = await db.announcement.findMany({
    where: { active: true, OR: [{ role: null }, { role: "SMM" }] },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, body: true, buttonText: true, buttonUrl: true },
  });
  return rows
    .filter((r) => r.title.trim())
    .map((r) => ({ id: r.id, title: r.title, body: r.body, buttonText: r.buttonText || null, buttonUrl: r.buttonUrl }));
}
