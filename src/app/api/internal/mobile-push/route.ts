import { NextResponse } from "next/server";

import { sendMobilePush } from "@/lib/fcm";
import { verifyInternal } from "@/lib/sso";

type Payload = {
  userId: string;
  title: string;
  body: string;
  conversationId: string;
  data?: Record<string, string>;
};

/**
 * Ichki (server-server): tayyorr+ va Tayyorr SMM xabarnomalari uchun mobil ilovaga (FCM) push —
 * Firebase kaliti faqat shu loyihada. `p` — JSON matn, imzo `mobile-push.${ts}.${p}` ustida, 2 daqiqa amal qiladi.
 */
export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as { p?: unknown; ts?: unknown; sig?: unknown } | null;
  const p = typeof raw?.p === "string" ? raw.p : null;
  const ts = typeof raw?.ts === "number" ? raw.ts : NaN;
  const sig = typeof raw?.sig === "string" ? raw.sig : "";
  if (!p || !Number.isFinite(ts) || Math.abs(Date.now() - ts) > 120_000 || !(await verifyInternal(`mobile-push.${ts}.${p}`, sig))) {
    return NextResponse.json({ error: "Ruxsat yöq" }, { status: 401 });
  }
  const m = JSON.parse(p) as Payload;
  if (!m.userId || !m.title || !m.conversationId) return NextResponse.json({ error: "Notöğri sörov" }, { status: 400 });
  await sendMobilePush(m.userId, {
    title: m.title,
    body: (m.body ?? "").slice(0, 200),
    conversationId: m.conversationId,
    data: m.data ?? {},
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
