import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { restrictionApiError } from "@/lib/restriction";
import { logActivity } from "@/lib/activity";
import { birthDateSchema } from "@/lib/birthday";

const schema = z.object({
  // "YYYY-MM-DD" — profilda tahrirlanadi
  birthDate: birthDateSchema.optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  about: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      login: true,
      email: true,
      role: true,
      about: true,
      avatarUrl: true,
      isAvailable: true,
    },
  });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const restricted = await restrictionApiError(session.user.id);
  if (restricted) return restricted;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...data,
      ...(data.firstName && data.lastName
        ? { name: `${data.firstName} ${data.lastName}` }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, about: true, avatarUrl: true, birthDate: true },
  });

  if (Object.keys(data).length > 0) {
    await logActivity(
      session.user.id,
      "PROFILE_UPDATE",
      `Profilni tahrirladi: ${Object.keys(data).join(", ")}`,
    );
  }

  return NextResponse.json({ user: updated });
}
