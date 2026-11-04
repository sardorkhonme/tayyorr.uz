import { NextResponse } from "next/server";

import { maybeCheckProviderBalance } from "@/lib/balance-alert";

/**
 * Admin paneldagi "Yangilash" tugmasi: provayder balansini hozir tekshirib bazaga yozadi
 * (o'zgargan bo'lsa Telegramga xabar). Balansning o'zini qaytarmaydi — admin bazadan o'qiydi.
 * 10 soniyada ko'pi bilan bir marta ishlaydi.
 */
export async function POST() {
  const r = await maybeCheckProviderBalance(10_000);
  return NextResponse.json({ ok: true, checked: r !== null });
}
