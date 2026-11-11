import { NextResponse } from "next/server";

import { familyPresence } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Guruh oynasi ochiq turganda daqiqada bir marta: a'zolar va onlayn soni (so'rovning o'zi ham «onlayn»ni yangilaydi). */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  return mobileJson(await familyPresence());
}
