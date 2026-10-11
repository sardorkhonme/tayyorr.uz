import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { postOrderToChannel } from "@/lib/telegram";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

/** Bosh sahifa uchun buyurtmalar ro'yxati — web dashboard bilan bir xil mantiq. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const me = await db.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (!me) return mobileJson({ error: "Topilmadi" }, { status: 404 });

  const isPreparer = me.role === "PREPARER";

  const orders = await db.order.findMany({
    where: isPreparer
      ? { deletedAt: null, OR: [{ status: "OPEN" }, { preparerId: auth.userId }] }
      : { ordererId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      orderer: { select: { name: true, login: true } },
      _count: { select: { offers: true } },
    },
  });

  return mobileJson({
    orders: orders.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      type: o.type,
      status: o.status,
      budget: o.budget,
      offers: o._count.offers,
      createdAt: o.createdAt.toISOString(),
      ordererLabel: isPreparer ? o.orderer.login ?? o.orderer.name ?? null : null,
      deleted: !!o.deletedAt,
      deleteReason: o.deleteReason,
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(5).max(150),
  type: z
    .enum(["PRESENTATION", "COURSE_WORK", "REFERAT", "ESSAY", "DIPLOMA", "OTHER"])
    .default("OTHER"),
  description: z.string().min(10).max(5000),
  deadline: z.string().datetime().optional(),
  budget: z.number().int().positive().optional(),
});

/** Yangi buyurtma yaratish — faqat buyurtma beruvchilar uchun, web bilan bir xil mantiq. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const me = await db.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (!me) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (me.role !== "ORDERER") {
    return mobileJson(
      { error: "Faqat buyurtma beruvchilar buyurtma qo'sha oladi" },
      { status: 403 },
    );
  }

  const restriction = await getRestriction(auth.userId);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson(
      { error: parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
      { status: 400 },
    );
  }
  const { title, type, description, deadline, budget } = parsed.data;
  if (deadline && new Date(deadline).getTime() <= Date.now()) {
    return mobileJson({ error: "Muddat o'tib ketgan vaqt bo'lmasin" }, { status: 400 });
  }

  const order = await db.order.create({
    data: {
      ordererId: auth.userId,
      title,
      type,
      description,
      deadline: deadline ? new Date(deadline) : null,
      budget,
    },
  });

  await postOrderToChannel(order);
  await logActivity(auth.userId, "ORDER_CREATE", `Buyurtma yaratdi: «${title}» (mobil ilova)`, {
    orderId: order.id,
    budget: budget ?? null,
  });

  const orderer = await db.user.findUnique({
    where: { id: auth.userId },
    select: { login: true, name: true, firstName: true, lastName: true, email: true },
  });

  await logToGroup(
    "orders",
    "📦 Yangi buyurtma (mobil ilova)",
    [
      `«${title}»`,
      `Turi: ${type}`,
      description.length > 500 ? `${description.slice(0, 500)}…` : description,
      budget ? `Byudjet: ${budget.toLocaleString("ru-RU")} so'm` : "Byudjet: kelishiladi",
      `Buyurtmachi: ${userLabel(orderer)}`,
      `Buyurtma ID: ${order.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${order.id}`),
  );

  return mobileJson({ order: { id: order.id } }, { status: 201 });
}
