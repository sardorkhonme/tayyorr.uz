import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getMaintenance } from "@/lib/maintenance";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/**
 * Landing (tayyorr.uz) uchun: "texnik ishlar" rejimi yoqilganmi va shu brauzerdagi foydalanuvchi
 * ruxsat ro'yxatidami. Yoqilgan bo'lsa landing boshqa subdomenga o'tishda xabar ko'rsatadi.
 * SSO cookie (.tayyorr.uz) yuborilishi uchun CORS credentials bilan.
 */
export const dynamic = "force-dynamic";

const ORIGINS = /^https:\/\/(www\.)?tayyorr\.uz$|^http:\/\/localhost:\d+$/;

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!ORIGINS.test(origin)) return {} as Record<string, string>;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    vary: "Origin",
  };
}

export async function GET(req: Request) {
  const m = await getMaintenance();
  const uid = m.on ? await verifySso((await cookies()).get(SSO_COOKIE)?.value) : null;
  return NextResponse.json(
    { on: m.on, message: m.message, allowed: !m.on || (!!uid && m.allow.includes(uid)) },
    { headers: { ...cors(req), "cache-control": "no-store" } },
  );
}
