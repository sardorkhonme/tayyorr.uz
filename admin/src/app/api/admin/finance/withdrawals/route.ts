import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { getWithdrawals, saveWithdrawals } from "@/lib/finance";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive().max(10_000_000_000),
  note: z.string().trim().max(200).optional(),
});

/** Bank hisobidan o'zingiz uchun yechib olgan pulni yozib qo'yish. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Sana va summani töğri kiriting" }, { status: 400 });
  const list = await getWithdrawals();
  await saveWithdrawals([...list, { id: crypto.randomUUID(), ...parsed.data, note: parsed.data.note || undefined }]);
  return NextResponse.json({ ok: true });
}

/** Xato yozuvni o'chirish: ?id=… */
export async function DELETE(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  const list = await getWithdrawals();
  if (!id || !list.some((w) => w.id === id)) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  await saveWithdrawals(list.filter((w) => w.id !== id));
  return NextResponse.json({ ok: true });
}
