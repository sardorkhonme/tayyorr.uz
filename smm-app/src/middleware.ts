import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { maintenanceGate } from "@/lib/maintenance";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/** smm.tayyorr.uz — doimiy iz (lib/audit.ts) va "texnik ishlar" rejimi tekshiruvi (lib/maintenance.ts). */
export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const uid = await verifySso(req.cookies.get(SSO_COOKIE)?.value);
  audit(req, (p) => ev.waitUntil(p), "smm", uid ? "USER" : "GUEST", uid);
  const gate = await maintenanceGate(req, uid, "smm");
  return gate ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|wav|mp4|webm)$).*)"],
};
