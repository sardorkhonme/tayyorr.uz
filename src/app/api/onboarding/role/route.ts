import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { chooseRole } from "@/lib/role-select";

const schema = z.object({ role: z.enum(["ORDERER", "PREPARER"]) });

/** Profili to'liq, lekin roli yo'q hisob uchun — faqat rol tanlash. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Rolni tanlang" }, { status: 400 });

  const r = await chooseRole(session.user.id, parsed.data.role, "sayt");
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
