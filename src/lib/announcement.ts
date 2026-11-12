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

/**
 * Foydalanuvchiga ko'rinadigan faol e'lonlar, 3 tilda.
 * section "uz" — hammaga + foydalanuvchi roli (ORDERER/PREPARER); "smm" — hammaga + "SMM".
 */
export async function getActiveAnnouncements(
  role: string | null | undefined,
  section: "uz" | "smm" = "uz",
): Promise<AnnItem[]> {
  const audience = section === "smm" ? "SMM" : role;
  const rows = await db.announcement.findMany({
    where: {
      active: true,
      OR: [{ role: null }, ...(audience ? [{ role: audience }] : [])],
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
