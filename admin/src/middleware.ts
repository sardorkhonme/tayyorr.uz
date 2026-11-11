import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { audit } from "@/lib/audit";

/**
 * admin.tayyorr.uz — umumiy komponentlar (chat, shartnoma) foydalanuvchi sahifalariga
 * havola beradi; adminda ularning o'z sahifalariga yo'naltiramiz. Eski /sardorxon/admin/...
 * havolalari ham ishlaydi.
 */
const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^\/sardorxon\/admin(\/.*)?$/, (m) => m[1] || "/"],
  [/^\/u\/([^/]+)\/?$/, (m) => `/users/${m[1]}`],
  [/^\/dashboard\/?$/, () => "/"],
];

/** Admin cookie (lib/admin.ts createAdminToken bilan bir xil: HMAC-SHA256, base64url) — edge'da tekshirish. */
async function isAdminRequest(req: NextRequest) {
  const token = req.cookies.get("tyr_admin")?.value;
  const [payload, sig] = token?.split(".") ?? [];
  if (!payload || !sig) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(process.env.AUTH_SECRET || "dev-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
    let b = "";
    for (const x of mac) b += String.fromCharCode(x);
    if (btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") !== sig) return false;
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const path = req.nextUrl.pathname;
  for (const [re, to] of RULES) {
    const m = path.match(re);
    if (m) return NextResponse.redirect(new URL(to(m) + req.nextUrl.search, req.url));
  }
  // doimiy iz (Loglar): adminning har bir sahifasi va amali
  // admin cookie imzosini faqat yoziladigan so'rovda tekshiramiz (o'qishlar auditga yozilmaydi)
  const m = req.method.toUpperCase();
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") {
    audit(req, (p) => ev.waitUntil(p), "admin", (await isAdminRequest(req)) ? "ADMIN" : "GUEST", null);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|wav|mp4|webm)$).*)"],
};
