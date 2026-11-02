import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { restrictionApiError } from "@/lib/restriction";
import { requestRevision } from "@/lib/contract-flow";
import { revisionSchema } from "@/lib/contract-schema";

/** Buyurtmachi topshirilgan ishni sabab va yangi muddat bilan qayta ishlashga qaytaradi. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const restricted = await restrictionApiError(session.user.id);
  if (restricted) return restricted;
  const { id } = await params;

  const parsed = revisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" },
      { status: 400 },
    );
  }
  const r = await requestRevision(id, session.user.id, parsed.data.reason, new Date(parsed.data.deadline));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
