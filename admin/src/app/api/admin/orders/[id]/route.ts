import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { softDeleteOrder } from "@/lib/order-delete";
import { markOrderRemovedInChannel } from "@/lib/telegram";

const schema = z.object({ reason: z.string().trim().min(3).max(500) });

/** Buyurtmani o'chiradi (soft). Sabab shart. Faol shartnomadagi mablag' qaytadi. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "O'chirish sababini yozing (kamida 3 belgi)" },
      { status: 400 },
    );
  }

  const order = await softDeleteOrder(id, "ADMIN", parsed.data.reason);
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  if (order.telegramMessageId) {
    await markOrderRemovedInChannel(
      order.telegramMessageId,
      order.title,
      "Administrator",
      parsed.data.reason,
    );
  }

  return NextResponse.json({ ok: true });
}
