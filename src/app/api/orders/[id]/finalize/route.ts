import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { restrictionApiError } from "@/lib/restriction";
import { finalizeWork } from "@/lib/contract-flow";

/** Buyurtmachi ishni yakunlaydi -> eskroudan tayyorlovchiga to'liq (100%) o'tadi. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const restricted = await restrictionApiError(session.user.id);
  if (restricted) return restricted;
  const { id } = await params;

  const r = await finalizeWork(id, session.user.id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
