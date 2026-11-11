import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { apkUrl, getMobileUpdate } from "@/lib/mobile-update";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/** "Ilovani yuklab olish" bosilganini qayd qiladi va APK fayliga yo'naltiradi. */
export async function GET() {
  const h = await headers();
  const session = await auth().catch(() => null);
  // tayyorr+ / SMM / landingdan bosilganda — umumiy SSO cookie orqali kim ekanini bilamiz
  const userId = session?.user?.id ?? (await verifySso((await cookies()).get(SSO_COOKIE)?.value).catch(() => null));
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  await db.appDownload
    .create({
      data: {
        userId: userId ?? null,
        ip,
        userAgent: h.get("user-agent"),
      },
    })
    .catch(() => {});

  // admin yuklagan eng yangi APK (sozlanmagan bo'lsa — app/tayyorr.apk)
  return NextResponse.redirect(apkUrl(await getMobileUpdate()), 302);
}
