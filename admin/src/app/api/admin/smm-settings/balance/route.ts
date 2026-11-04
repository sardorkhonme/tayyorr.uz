import { NextResponse } from "next/server";

import { adminApiGuard } from "@/lib/admin";

const SMM_URL = (process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz").replace(/\/+$/, "");

/**
 * Provayder (smmcloud) balansini hozir tekshirtiradi. Provayder kaliti faqat smm.tayyorr.uz da —
 * shuning uchun o'sha sayt tekshirib bazaga yozadi, admin sahifasi bazadan o'qiydi.
 */
export async function POST() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  try {
    const res = await fetch(`${SMM_URL}/api/provider-balance`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error();
  } catch {
    return NextResponse.json({ error: "Tayyorr SMM javob bermadi" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
