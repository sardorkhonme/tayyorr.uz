import { NextResponse, type NextRequest } from "next/server";

import { maintenanceGate } from "@/lib/maintenance";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/** smm.tayyorr.uz — hozircha faqat "texnik ishlar" rejimi tekshiruvi (lib/maintenance.ts). */
export async function middleware(req: NextRequest) {
  const gate = await maintenanceGate(req, await verifySso(req.cookies.get(SSO_COOKIE)?.value), "smm");
  return gate ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|wav|mp4|webm)$).*)"],
};
