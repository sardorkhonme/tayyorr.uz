import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createRealtimeToken, realtimeEnabled, userChannel } from "@/lib/realtime";

/** Real-time (Ably) token — faqat o'z kanalini eshitish huquqi. Sozlanmagan bo'lsa 204: so'rab turish ishlaydi. */
export async function GET() {
  if (!realtimeEnabled()) return new NextResponse(null, { status: 204 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const token = await createRealtimeToken(session.user.id, [userChannel(session.user.id)]);
  if (!token) return new NextResponse(null, { status: 204 });
  return NextResponse.json(token, { headers: { "Cache-Control": "no-store" } });
}
