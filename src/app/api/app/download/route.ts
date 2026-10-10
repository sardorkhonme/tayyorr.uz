import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/r2";

/** "Ilovani yuklab olish" bosilganini qayd qiladi va APK fayliga yo'naltiradi. */
export async function GET() {
  const h = await headers();
  const session = await auth().catch(() => null);
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  await db.appDownload
    .create({
      data: {
        userId: session?.user?.id ?? null,
        ip,
        userAgent: h.get("user-agent"),
      },
    })
    .catch(() => {});

  return NextResponse.redirect(publicUrl("app/tayyorr.apk"), 302);
}
