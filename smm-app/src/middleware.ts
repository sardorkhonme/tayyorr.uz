import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { getMaintenance, maintenanceGate } from "@/lib/maintenance";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/** smm.tayyorr.uz — doimiy iz (lib/audit.ts) va "texnik ishlar" rejimi tekshiruvi (lib/maintenance.ts). */
export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // API o'qish so'rovlarida (buyurtmalar holati, support) foydalanuvchini faqat kerak bo'lganda aniqlaymiz
  const method = req.method.toUpperCase();
  const read = req.nextUrl.pathname.startsWith("/api/") && (method === "GET" || method === "HEAD" || method === "OPTIONS");
  const need = !read || (await getMaintenance()).on;
  const uid = need ? await verifySso(req.cookies.get(SSO_COOKIE)?.value) : null;
  if (!read) audit(req, (p) => ev.waitUntil(p), "smm", uid ? "USER" : "GUEST", uid);
  const gate = await maintenanceGate(req, uid, "smm");
  return gate ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|wav|mp4|webm)$).*)"],
};
