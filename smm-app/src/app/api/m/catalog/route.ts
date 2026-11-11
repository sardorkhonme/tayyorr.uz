import { after, NextResponse } from "next/server";

import { loadCatalog } from "@/lib/catalog";
import { KINDS, LINK_HINTS } from "@/lib/kinds";
import { serviceView } from "@/lib/mobile-view";
import { PLATFORMS } from "@/lib/platforms";
import { db } from "@/lib/db";
import { maybeSyncServices } from "@/lib/sync-services";

/** Mobil ilova: xizmatlar katalogi (narx, chegirma, kafolat, tavsiya) + platforma va tur ma'lumotlari. Ochiq. */
export async function GET() {
  // saytdagi bosh sahifa kabi: bo'sh bo'lsa darhol, aks holda fonda (6 soatda ko'pi bilan bir marta)
  if ((await db.smmService.count({ where: { active: true } })) === 0) await maybeSyncServices();
  else after(() => maybeSyncServices());
  const services = (await loadCatalog()).map(serviceView);
  return NextResponse.json({
    services,
    platforms: PLATFORMS.map(({ key, name, from, to }) => ({ key, name, from, to, linkHint: LINK_HINTS[key] ?? "" })),
    kinds: KINDS.map(({ key, label, hint, color }) => ({ key, label, hint, color })),
  });
}
