import { NextResponse } from "next/server";

import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { requestRevision } from "@/lib/contract-flow";
import { revisionSchema } from "@/lib/contract-schema";

export { OPTIONS } from "@/lib/mobile-cors";

/** Qayta ishlashga qaytarish — web /api/orders/[id]/revision bilan bir xil. */
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
  const parsed = revisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" }, { status: 400 });
  }
  const r = await requestRevision(id, me, parsed.data.reason, new Date(parsed.data.deadline));
  if (!r.ok) return mobileJson({ error: r.error }, { status: r.status });
  return mobileJson({ ok: true });
}
