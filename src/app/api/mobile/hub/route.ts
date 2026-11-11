import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** tayyorr+ bosh sahifasi (ilovada): xizmatlar soni va foydalanuvchining platformalari. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const [smmServices, smmOrders, me] = await Promise.all([
    db.smmService.count({ where: { active: true } }),
    db.smmOrder.count({ where: { userId: auth.userId } }),
    db.user.findUnique({ where: { id: auth.userId }, select: { role: true, walletCode: true } }),
  ]);
  return mobileJson({ smmServices, smmOrders, role: me?.role ?? null, walletCode: me?.walletCode ?? null });
}
