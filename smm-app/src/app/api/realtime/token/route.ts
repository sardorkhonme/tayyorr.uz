import { NextResponse } from "next/server";

import { createRealtimeToken, realtimeEnabled, userChannel } from "@/lib/realtime";
import { currentUser } from "@/lib/session";

/** Real-time (Ably) token — faqat o'z kanalini eshitish huquqi. Sozlanmagan bo'lsa 204: so'rab turish ishlaydi. */
export async function GET() {
  if (!realtimeEnabled()) return new NextResponse(null, { status: 204 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const token = await createRealtimeToken(user.id, [userChannel(user.id)]);
  if (!token) return new NextResponse(null, { status: 204 });
  return NextResponse.json(token, { headers: { "Cache-Control": "no-store" } });
}
