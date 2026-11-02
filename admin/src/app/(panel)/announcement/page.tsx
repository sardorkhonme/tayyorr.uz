import { db } from "@/lib/db";
import {
  AnnouncementManager,
  type Banner,
} from "@/components/admin/announcement-manager";

export default async function AdminAnnouncement() {
  const rows = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  const initial: Banner[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    titleRu: a.titleRu ?? "",
    titleEn: a.titleEn ?? "",
    body: a.body,
    bodyRu: a.bodyRu ?? "",
    bodyEn: a.bodyEn ?? "",
    buttonText: a.buttonText ?? "",
    buttonTextRu: a.buttonTextRu ?? "",
    buttonTextEn: a.buttonTextEn ?? "",
    buttonUrl: a.buttonUrl ?? "",
    role: (a.role as Banner["role"]) ?? "",
    active: a.active,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white">E'lon bannerlari</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Buyurtmalar ro'yxati ustida (faqat kompyuterda) ko'rinadi. Bir nechta
          faol bo'lsa navbatlashib turadi.
        </p>
      </div>
      <AnnouncementManager initial={initial} />
    </div>
  );
}
