import { db } from "@/lib/db";

export interface LocaleText {
  uz: string;
  ru: string;
  en: string;
}

export interface AnnItem {
  id: string;
  title: LocaleText;
  body: LocaleText;
  buttonText: LocaleText;
  buttonUrl: string | null;
}

/** Foydalanuvchiga ko'rinadigan faol e'lonlar (rol bo'yicha), 3 tilda. */
export async function getActiveAnnouncements(
  role: string | null | undefined,
): Promise<AnnItem[]> {
  const rows = await db.announcement.findMany({
    where: {
      active: true,
      OR: [{ role: null }, ...(role ? [{ role }] : [])],
    },
    orderBy: { createdAt: "desc" },
  });

  return rows
    .filter((r) => r.title.trim())
    .map((r) => ({
      id: r.id,
      title: {
        uz: r.title,
        ru: r.titleRu?.trim() || r.title,
        en: r.titleEn?.trim() || r.title,
      },
      body: {
        uz: r.body,
        ru: r.bodyRu?.trim() || r.body,
        en: r.bodyEn?.trim() || r.body,
      },
      buttonText: {
        uz: r.buttonText ?? "",
        ru: r.buttonTextRu?.trim() || r.buttonText || "",
        en: r.buttonTextEn?.trim() || r.buttonText || "",
      },
      buttonUrl: r.buttonUrl,
    }));
}
