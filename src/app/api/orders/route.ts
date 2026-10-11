import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { restrictionApiError } from "@/lib/restriction";
import { postOrderToChannel } from "@/lib/telegram";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

const createSchema = z.object({
  title: z.string().min(5).max(150),
  type: z
    .enum([
      "PRESENTATION",
      "COURSE_WORK",
      "REFERAT",
      "ESSAY",
      "DIPLOMA",
      "OTHER",
    ])
    .default("OTHER"),
  description: z.string().min(10).max(5000),
  deadline: z.string().datetime().optional(),
  budget: z.number().int().positive().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }

  const where =
    session.user.role === "ORDERER"
      ? { ordererId: session.user.id }
      : {
          deletedAt: null,
          OR: [
            { status: "OPEN" as const },
            { preparerId: session.user.id },
          ],
        };

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      orderer: {
        select: { id: true, name: true, login: true, avatarUrl: true, image: true },
      },
      _count: { select: { offers: true } },
    },
  });

  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  if (session.user.role !== "ORDERER") {
    return NextResponse.json(
      { error: "Faqat buyurtma beruvchilar buyurtma qo'sha oladi" },
      { status: 403 },
    );
  }
  const restricted = await restrictionApiError(session.user.id);
  if (restricted) return restricted;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
      { status: 400 },
    );
  }

  const { title, type, description, deadline, budget } = parsed.data;
  if (deadline && new Date(deadline).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Muddat o'tib ketgan vaqt bo'lmasin" }, { status: 400 });
  }

  const order = await db.order.create({
    data: {
      ordererId: session.user.id,
      title,
      type,
      description,
      deadline: deadline ? new Date(deadline) : null,
      budget,
    },
  });

  // kanalga joylaymiz — helper hech qachon xato tashlamaydi (try/catch + 8s timeout)
  await postOrderToChannel(order);

  await logActivity(session.user.id, "ORDER_CREATE", `Buyurtma yaratdi: «${title}»`, {
    orderId: order.id,
    budget: budget ?? null,
  });

  const orderer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { login: true, name: true, firstName: true, lastName: true, email: true },
  });

  await logToGroup(
    "orders",
    "📦 Yangi buyurtma",
    [
      `«${title}»`,
      `Turi: ${type}`,
      description.length > 500 ? `${description.slice(0, 500)}…` : description,
      budget ? `Byudjet: ${budget.toLocaleString("ru-RU")} so'm` : "Byudjet: kelishiladi",
      deadline ? `Muddat: ${shortDateTime(new Date(deadline))}` : "",
      `Buyurtmachi: ${userLabel(orderer)}`,
      orderer?.email ? `Email: ${orderer.email}` : "",
      `Buyurtma ID: ${order.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${order.id}`),
  );

  return NextResponse.json({ order }, { status: 201 });
}
