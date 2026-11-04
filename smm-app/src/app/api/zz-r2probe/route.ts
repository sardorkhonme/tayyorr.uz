import { NextResponse } from "next/server";

import { presignPrivate } from "@/lib/r2";

/** VAQTINCHALIK: R2 yopiq bucket havolasi ishlashini tekshirish (faqat holat kodi). */
export async function GET() {
  const env = process.env;
  const info = {
    hasAccount: !!env.R2_ACCOUNT_ID,
    hasKey: !!env.R2_ACCESS_KEY_ID,
    hasSecret: !!env.R2_SECRET_ACCESS_KEY,
    hasEndpoint: !!env.R2_ENDPOINT,
    privateBucketSet: !!env.R2_BUCKET_PRIVATE,
  };
  try {
    const url = await presignPrivate("chat/zz-probe/probe.txt");
    const u = new URL(url);
    const res = await fetch(url);
    const text = await res.text();
    return NextResponse.json({ ...info, host: u.host, status: res.status, code: /<Code>([^<]+)/.exec(text)?.[1] ?? null });
  } catch (e) {
    return NextResponse.json({ ...info, error: String(e).slice(0, 200) });
  }
}
