import { NextResponse } from "next/server";

import { requireMobileAuth } from "@/lib/mobile-auth";
import { corsHeaders, mobileJson } from "@/lib/mobile-cors";
import { createRealtimeToken, realtimeEnabled, userChannel } from "@/lib/realtime";

export { OPTIONS } from "@/lib/mobile-cors";

/**
 * Mobil ilova uchun real-time (Ably SSE) token — faqat o'z kanalini eshitish huquqi (1 soat).
 * Sozlanmagan bo'lsa 204 — ilova oldingidek so'rab turadi. Saytdagi /api/realtime/token bilan bir xil.
 */
export async function GET(req: Request) {
  if (!realtimeEnabled()) return new NextResponse(null, { status: 204, headers: corsHeaders() });
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const token = await createRealtimeToken(auth.userId, [userChannel(auth.userId)]);
  if (!token) return new NextResponse(null, { status: 204, headers: corsHeaders() });
  return mobileJson(token);
}
