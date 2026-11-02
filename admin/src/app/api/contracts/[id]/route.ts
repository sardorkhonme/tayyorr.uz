import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { restrictionApiError } from "@/lib/restriction";
import { contractAction } from "@/lib/contract-flow";
import { contractActionSchema } from "@/lib/contract-schema";

/** Shartnoma: qabul / rad / bekor (SENT) va bekor qilish so'rovi (imzolangan). */
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
  const parsed = contractActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Noto'g'ri amal" },
      { status: 400 },
    );
  }
  const r = await contractAction(id, session.user.id, parsed.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
