import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { describeDevice } from "@/lib/user-agent";

const PAGE_SIZE = 30;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const action = (searchParams.get("action") ?? "").trim();
  const page = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);

  const where: Prisma.ActivityLogWhereInput = { userId: id };
  if (action) where.action = action;
  if (q) where.summary = { contains: q, mode: "insensitive" };

  const [rows, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r.id,
      action: r.action,
      summary: r.summary,
      ip: r.ip,
      device: describeDevice(r.userAgent),
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    hasMore: (page + 1) * PAGE_SIZE < total,
  });
}
