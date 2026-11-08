import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { DEPOSIT_METHODS, getDeposits, saveDeposits } from "@/lib/finance";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(Object.keys(DEPOSIT_METHODS) as [keyof typeof DEPOSIT_METHODS, ...(keyof typeof DEPOSIT_METHODS)[]]),
  paid: z.number().int().positive().max(10_000_000_000),
  feePct: z.number().min(0).max(50),
  note: z.string().trim().max(200).optional(),
});

/** Provayderga (smmcloud) pul tashlashni yozib qo'yish. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Sana, summa va foizni töğri kiriting" }, { status: 400 });
  const list = await getDeposits();
  await saveDeposits([...list, { id: crypto.randomUUID(), ...parsed.data, note: parsed.data.note || undefined }]);
  return NextResponse.json({ ok: true });
}

/** Xato kiritilgan yozuvni o'chirish: ?id=… */
export async function DELETE(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  const list = await getDeposits();
  if (!id || !list.some((d) => d.id === id)) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  await saveDeposits(list.filter((d) => d.id !== id));
  return NextResponse.json({ ok: true });
}
