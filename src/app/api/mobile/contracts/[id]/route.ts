import { NextResponse } from "next/server";

import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { contractAction } from "@/lib/contract-flow";
import { contractActionSchema } from "@/lib/contract-schema";

export { OPTIONS } from "@/lib/mobile-cors";

/** Shartnoma amallari — web /api/contracts/[id] bilan bir xil mantiq (lib/contract-flow). */
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
  const parsed = contractActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri amal" }, { status: 400 });
  }
  const r = await contractAction(id, me, parsed.data);
  if (!r.ok) return mobileJson({ error: r.error }, { status: r.status });
  return mobileJson({ ok: true });
}
