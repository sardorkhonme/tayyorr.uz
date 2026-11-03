import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getSmmSettings, refreshSmmUsdRate } from "@/lib/smm-settings";
import { ADJUST_KEY, parseAdjust } from "@/lib/smm-adjust";
import { SmmServicesEditor } from "@/components/admin/smm-services-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "SMM xizmatlari" };

/** Tayyorr SMM: xizmatlar guruhi yoki alohida xizmat uchun chegirma/ustama va yashirish. */
export default async function AdminSmmServices() {
  await requireAdmin();

  let settings = await getSmmSettings();
  if (!settings.usd) {
    await refreshSmmUsdRate();
    settings = await getSmmSettings();
  }

  const [services, adjustRow] = await Promise.all([
    db.smmService.findMany({
      where: { active: true },
      orderBy: [{ platform: "asc" }, { providerRate: "asc" }],
      select: { providerId: true, platform: true, category: true, name: true, providerRate: true, min: true, max: true },
    }),
    db.appSetting.findUnique({ where: { key: ADJUST_KEY } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smm-mark.png" alt="" className="h-7 w-7 object-contain" />
          SMM xizmatlari
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Butun guruhga (masalan Instagram → Körişlar) yoki alohida xizmatga çegirma (−) yoki ustama (+) qöying,
          keraksizlarini yaşiring. Umumiy ustama ({settings.markupPercent}%) ustidan hisoblanadi; xizmatning öz foizi
          guruh foizidan ustun turadi. Saqlangaç saytda 1 daqiqa içida yangilanadi.
        </p>
      </div>

      {settings.usd ? (
        <SmmServicesEditor
          services={services}
          fx={settings.usd.rate}
          markupPercent={settings.markupPercent}
          initial={parseAdjust(adjustRow?.value ?? null)}
        />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-red-400">
          Dollar kursini olib bölmadi — narxlarni hisoblaş uçun birozdan keyin qayta oçing.
        </p>
      )}
    </div>
  );
}
