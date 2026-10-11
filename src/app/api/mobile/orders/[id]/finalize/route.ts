import { NextResponse } from "next/server";

import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { finalizeWork } from "@/lib/contract-flow";

export { OPTIONS } from "@/lib/mobile-cors";

/** Buyurtmachi ishni yakunlaydi -> eskroudan tayyorlovchiga to'liq o'tadi — web bilan bir xil mantiq. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

  const restriction = await getRestriction(me);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const { id } = await params;
  const r = await finalizeWork(id, me);
  if (!r.ok) return mobileJson({ error: r.error }, { status: r.status });
  return mobileJson({ ok: true });
}
