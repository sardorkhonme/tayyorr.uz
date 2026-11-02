import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { adminResolve } from "@/lib/contract-flow";

const schema = z.object({
  decision: z.enum(["CANCEL", "CONTINUE", "COMPLETE"]),
  note: z.string().trim().min(3, "Qaror izohini yozing (kamida 3 belgi)").max(1000),
  deadline: z.string().datetime().optional(),
});

/** Nizo bo'yicha admin qarori: bekor qilish (pul qaytadi), davom ettirish yoki yakunlash (pul tayyorlovchiga). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" },
      { status: 400 },
    );
  }
  const { decision, note, deadline } = parsed.data;
  const r = await adminResolve(id, decision, note, deadline ? new Date(deadline) : null);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
