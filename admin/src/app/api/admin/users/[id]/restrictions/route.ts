import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const SCOPES = ["smm", "smm_service", "uz_orders", "uz_offers", "uz_chat", "payout", "family"] as const;

const addSchema = z.object({
  scopes: z.array(z.enum(SCOPES)).default([]),
  /** smm_service uchun — tanlangan xizmatlar */
  serviceIds: z.array(z.string()).max(100).default([]),
  until: z.string().optional(),
  indefinite: z.boolean().optional().default(false),
  reason: z.string().trim().max(1000).optional(),
});

/** Qisman cheklov qo'yish: tanlangan imkoniyatlar (va SMM xizmatlari) — bitta muddat va sabab bilan. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { id } = await params;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri maʼlumot" }, { status: 400 });
  const { scopes, serviceIds, indefinite, reason } = parsed.data;
  const plain = scopes.filter((s) => s !== "smm_service");
  if (!plain.length && !serviceIds.length) return NextResponse.json({ error: "Nimani çeklaşni tanlang" }, { status: 400 });

  let until: Date;
  if (indefinite) until = new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000);
  else {
    until = new Date(parsed.data.until ?? "");
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Muddat kelajakda bölsin" }, { status: 400 });
    }
  }
  const user = await db.user.findUnique({ where: { id }, select: { isSupport: true } });
  if (!user || user.isSupport) return NextResponse.json({ error: "Foydalanuvçi topilmadi" }, { status: 404 });

  // bir xil soha (va xizmat) bo'yicha eski cheklov yangisi bilan almashadi
  await db.$transaction([
    db.userRestriction.deleteMany({
      where: { userId: id, OR: [{ scope: { in: plain } }, { scope: "smm_service", target: { in: serviceIds } }] },
    }),
    db.userRestriction.createMany({
      data: [
        ...plain.map((scope) => ({ userId: id, scope, until, reason: reason || null })),
        ...serviceIds.map((target) => ({ userId: id, scope: "smm_service", target, until, reason: reason || null })),
      ],
    }),
  ]);
  return NextResponse.json({ ok: true });
}

/** Bitta qisman cheklovni olib tashlash (?rid=...). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { id } = await params;
  const rid = new URL(req.url).searchParams.get("rid");
  if (!rid) return NextResponse.json({ error: "rid kerak" }, { status: 400 });
  await db.userRestriction.deleteMany({ where: { id: rid, userId: id } });
  return NextResponse.json({ ok: true });
}
