import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { OrderError, placeOrder, syncOrders } from "@/lib/orders";
import { providerConfigured } from "@/lib/provider";

const schema = z.object({
  serviceId: z.string().min(1),
  link: z
    .string()
    .trim()
    .min(3, "Havolani kiriting")
    .max(500)
    .refine((v) => /^(https?:\/\/|@)\S+$/i.test(v), "Havola https:// yoki @ bilan boshlansin"),
  quantity: z.coerce.number().int().positive("Miqdorni kiriting"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });

  await syncOrders(session.user.id);
  const orders = await db.smmOrder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { service: { select: { name: true, platform: true } } },
  });
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  if (!providerConfigured()) {
    return NextResponse.json({ error: "Xizmat vaqtincha ishlamayapti" }, { status: 503 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" },
      { status: 400 },
    );
  }

  try {
    const { serviceId, link, quantity } = parsed.data;
    const order = await placeOrder(session.user.id, serviceId, link, quantity);
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });
    return NextResponse.json({ order, balance: user?.balance ?? 0 });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[smm] order", e);
    return NextResponse.json({ error: "Kutilmagan xatolik" }, { status: 500 });
  }
}
