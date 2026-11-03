import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { sendSupportMessage } from "@/lib/support-actions";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { MESSAGE_SOURCES, stripSource, withSource, type MessageSource } from "@/lib/message-source";

const MAX = 5000;

function num(v: unknown): number | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const body = str(raw.body) ?? "";
  const bodyRu = str(raw.bodyRu);
  const bodyEn = str(raw.bodyEn);
  // qaysi platformaga: tayyorr.uz | tayyorr+ | ikkalasi (xabarga belgi qo'yiladi)
  const source: MessageSource =
    (MESSAGE_SOURCES as readonly unknown[]).includes(raw.source) ? (raw.source as MessageSource) : "tayyorr.uz";
  const textFor = (loc: string | null | undefined) =>
    withSource((loc === "ru" ? bodyRu : loc === "en" ? bodyEn : undefined) ?? body, source);
  const rf = raw.file as
    | { key?: string; name?: string; type?: string; size?: number }
    | undefined;
  const file =
    rf && typeof rf.key === "string" && typeof rf.name === "string"
      ? {
          key: rf.key,
          name: rf.name,
          type: typeof rf.type === "string" ? rf.type : "application/octet-stream",
          size: typeof rf.size === "number" ? rf.size : 0,
        }
      : null;

  if (!body && !file) {
    return NextResponse.json({ error: "Xabar yoki fayl kerak" }, { status: 400 });
  }

  const roleIn = str(raw.role);
  const role =
    roleIn === "ORDERER" || roleIn === "PREPARER" ? roleIn : undefined;
  const balanceMin = num(raw.balanceMin);
  const balanceMax = num(raw.balanceMax);
  const from = str(raw.registeredFrom);
  const to = str(raw.registeredTo);
  const preview = raw.preview === true;

  // bo'sh maydonlar hisobga olinmaydi (all)
  const where: Prisma.UserWhereInput = {
    isSupport: false,
    isPlatform: false,
    login: { not: null },
  };
  if (role) where.role = role;
  if (balanceMin !== undefined || balanceMax !== undefined) {
    where.balance = {};
    if (balanceMin !== undefined) where.balance.gte = balanceMin;
    if (balanceMax !== undefined) where.balance.lte = balanceMax;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
  }

  const count = await db.user.count({ where });

  if (preview) return NextResponse.json({ count });
  if (count === 0) {
    return NextResponse.json({ error: "Filtrga mos foydalanuvçi yöq" }, { status: 400 });
  }
  if (count > MAX) {
    return NextResponse.json(
      { error: `Juda köp (${count}). Filtrni toraytiring (maks. ${MAX}).` },
      { status: 400 },
    );
  }

  const record = await db.broadcast.create({
    data: {
      body: withSource(body, source),
      bodyRu: bodyRu ?? null,
      bodyEn: bodyEn ?? null,
      fileKey: file?.key ?? null,
      fileName: file?.name ?? null,
      fileType: file?.type ?? null,
      fileSize: file?.size ?? null,
      role: role ?? null,
      balanceMin: balanceMin ?? null,
      balanceMax: balanceMax ?? null,
      regFrom: from ? new Date(from) : null,
      regTo: to ? new Date(`${to}T23:59:59.999`) : null,
      sentCount: 0,
    },
  });

  const users = await db.user.findMany({
    where,
    select: { id: true, locale: true },
    take: MAX,
  });
  let sent = 0;
  for (const u of users) {
    try {
      await sendSupportMessage(u.id, textFor(u.locale), file, record.id);
      sent++;
    } catch {
      /* birini o'tkazib yuboramiz */
    }
  }
  await db.broadcast.update({ where: { id: record.id }, data: { sentCount: sent } });

  const fileUrl = record.fileKey
    ? await presignGet({ bucket: PRIVATE_BUCKET, key: record.fileKey, expiresIn: 3600 })
    : null;

  return NextResponse.json({
    ok: true,
    sent,
    broadcast: {
      id: record.id,
      body: stripSource(record.body),
      source,
      fileName: record.fileName,
      fileType: record.fileType,
      fileUrl,
      sentCount: sent,
      createdAt: record.createdAt.toISOString(),
    },
  });
}
