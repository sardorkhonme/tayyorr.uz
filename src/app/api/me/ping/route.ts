import { NextResponse, after } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sweepContracts } from "@/lib/contract-flow";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await db.user
    .update({ where: { id: session.user.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
  // muddati o'tgan shartnomalar (daqiqada ko'pi bilan 1 marta)
  after(() => sweepContracts());
  return NextResponse.json({ ok: true });
}
