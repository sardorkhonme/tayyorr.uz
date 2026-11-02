import { NextResponse } from "next/server";

import { adminApiGuard } from "@/lib/admin";
import { refreshSmmUsdRate } from "@/lib/smm-settings";

/** Dollar kursini Markaziy bankdan hozir yangilaydi. */
export async function POST() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const usd = await refreshSmmUsdRate();
  if (!usd) return NextResponse.json({ error: "Markaziy bank javob bermadi" }, { status: 502 });
  return NextResponse.json({ ok: true, usd });
}
