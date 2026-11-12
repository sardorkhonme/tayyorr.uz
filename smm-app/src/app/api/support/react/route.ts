import { NextResponse } from "next/server";

import { currentUser } from "@/lib/session";
import { parseReactionInput } from "@/lib/reactions";
import { reactSupportMessage } from "@/lib/support";

/** Support xabariga emoji reaksiya: { messageId, emoji } (o'sha emoji qayta bosilsa — olib tashlanadi). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { messageId?: unknown } | null;
  const input = parseReactionInput(body);
  if (!input || typeof body?.messageId !== "string") return NextResponse.json({ error: "Notöğri reaksiya" }, { status: 400 });
  const reactions = await reactSupportMessage(user.id, body.messageId, input);
  if (!reactions) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  return NextResponse.json({ reactions });
}
