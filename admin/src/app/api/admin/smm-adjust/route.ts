import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { logToGroup } from "@/lib/telegram-log";
import { ADJUST_KEY, parseAdjust } from "@/lib/smm-adjust";

/** SMM xizmatlari bo'yicha chegirma/ustama va yashirishni saqlaydi (butun jadval bir yo'la). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ma'lumot noto'g'ri" }, { status: 400 });
  }
  const adjust = parseAdjust(body);
  const value = JSON.stringify(adjust);
  await db.appSetting.upsert({
    where: { key: ADJUST_KEY },
    update: { value },
    create: { key: ADJUST_KEY, value },
  });

  const groups = Object.entries(adjust.groups).map(([k, v]) => `${k}: ${v > 0 ? "+" : ""}${v}%`);
  const svcs = Object.values(adjust.services);
  await logToGroup("smmSystem", "⚙️ SMM xizmatlari narxi o'zgartirildi", [
    groups.length ? `Guruhlar: ${groups.join(", ")}` : "Guruhlar: tuzatish yo'q",
    `Alohida xizmatlar: ${svcs.filter((s) => s.pct !== undefined).length} ta foiz, ${svcs.filter((s) => s.off).length} ta yashirilgan`,
  ]);
  return NextResponse.json({ ok: true, adjust });
}
