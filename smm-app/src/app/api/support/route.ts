import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser } from "@/lib/session";
import { listSupportMessages, sendSupportMessage } from "@/lib/support";

/** Support suhbati: ?open=1 — oyna ochiq (javoblar o'qilgan deb belgilanadi). */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const open = new URL(req.url).searchParams.get("open") === "1";
  // balans ham — hamyon o'zgarsa sahifa yangilanadi (support-widget)
  return NextResponse.json({ ...(await listSupportMessages(user.id, open)), balance: user.balance });
}

const schema = z.object({ text: z.string().trim().min(1, "Xabar yozing").max(2000, "Xabar juda uzun") });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Xabar yozing" }, { status: 400 });
  }
  const message = await sendSupportMessage(user.id, parsed.data.text);
  return NextResponse.json({ message });
}
