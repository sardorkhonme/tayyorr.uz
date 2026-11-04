import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { createRealtimeToken, realtimeEnabled, STAFF_CHANNEL, userChannel } from "@/lib/realtime";

/**
 * Real-time (Ably) token. Admin — barcha suhbatlar signali ("staff"), kirgan foydalanuvchi — o'z kanali.
 * Sozlanmagan bo'lsa 204: so'rab turish ishlaydi.
 */
export async function GET() {
  if (!realtimeEnabled()) return new NextResponse(null, { status: 204 });
  const [admin, session] = await Promise.all([isAdmin(), auth()]);
  const uid = session?.user?.id;
  const channels = [...(admin ? [STAFF_CHANNEL] : []), ...(uid ? [userChannel(uid)] : [])];
  if (!channels.length) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const token = await createRealtimeToken(uid ?? "admin", channels);
  if (!token) return new NextResponse(null, { status: 204 });
  return NextResponse.json(token, { headers: { "Cache-Control": "no-store" } });
}
