import { db } from "@/lib/db";
import { getPricing, priceInfo } from "@/lib/pricing";
import { isHidden } from "@/lib/smm-adjust";
import type { BoardService } from "@/components/service-card";

/**
 * Saytda ko'rinadigan xizmatlar: yashirilganlari olib tashlanadi, narx har safar
 * joriy kurs, umumiy ustama va admin qo'ygan chegirma/ustama bo'yicha hisoblanadi.
 */
export async function loadCatalog(): Promise<BoardService[]> {
  const [rows, pricing] = await Promise.all([
    db.smmService.findMany({
      where: { active: true },
      orderBy: [{ platform: "asc" }, { sort: "asc" }, { providerRate: "asc" }],
      select: {
        id: true,
        providerId: true,
        platform: true,
        category: true,
        name: true,
        description: true,
        providerRate: true,
        min: true,
        max: true,
        refill: true,
      },
    }),
    getPricing(),
  ]);
  if (!pricing) return [];
  return rows
    .filter((r) => !isHidden(pricing.adjust, r))
    .map(({ providerRate, providerId, ...s }) => ({
      ...s,
      ...priceInfo(providerRate, pricing, { providerId, ...s }),
    }));
}
