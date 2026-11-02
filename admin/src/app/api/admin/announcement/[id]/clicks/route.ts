import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

/** Shu e'lon tugmasini kimlar bosgani (oxirgi bosgani bo'yicha). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const rows = await db.announcementClick.findMany({
    where: { announcementId: id },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, login: true, role: true } },
    },
  });

  return NextResponse.json({
    clicks: rows.map((r) => ({
      userId: r.user.id,
      name: r.user.name,
      login: r.user.login,
      role: r.user.role,
      clickedAt: r.updatedAt.getTime(),
    })),
  });
}
