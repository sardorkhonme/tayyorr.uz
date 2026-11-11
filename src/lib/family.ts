import { after } from "next/server";
import type { FamilyMessage, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { sendFamilyPush } from "@/lib/fcm";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { FAMILY_CHANNEL, signal } from "@/lib/realtime";

/**
 * «Tayyorr's Family» — faqat mobil ilovadagi umumiy guruh.
 *  · xabarlar doimiy saqlanadi (o'chirilgani ham — admin panelda ko'rinadi);
 *  · fayllar ilovada 5 kun ochiladi (admin panelda — doimiy);
 *  · oddiy xabar — bildirishnomasiz; bildirishnoma: @belgilash, javob, admin «hammaga bildirish», qadash;
 *  · admin (admin paneldan belgilangan akkaunt yoki support) o'z nomidan, «Tayyorr.uz» yoki «Tayyorr Support»
 *    nomidan yoza oladi; «Tayyorr.uz» nomidan yozilgani a'zolarga anonim ko'rinadi.
 */
export const FAMILY_NAME = "Tayyorr's Family";
export const FILE_TTL_MS = 5 * 24 * 3600 * 1000;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz").replace(/\/+$/, "");

export const BRAND_LOGIN = "tayyorr.uz";
export const SUPPORT_LOGIN = "tayyorr_support";
export const BRAND_IMAGE = `${APP_URL}/icon-192.png`;
export const SUPPORT_IMAGE = `${APP_URL}/logo-mark.png`;

export type FamilyAs = "self" | "brand" | "support";
export type AuthorKind = "user" | "brand" | "support";

export interface FamilyAuthor {
  kind: AuthorKind;
  /** user — foydalanuvchi id; brand — "brand"; support — "support" */
  id: string;
  name: string;
  login: string | null;
  image: string | null;
}

const senderSelect = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  login: true,
  avatarUrl: true,
  image: true,
} satisfies Prisma.UserSelect;

export const familyInclude = {
  sender: { select: senderSelect },
  replyTo: { include: { sender: { select: senderSelect } } },
} satisfies Prisma.FamilyMessageInclude;

export type FamilyRow = Prisma.FamilyMessageGetPayload<{ include: typeof familyInclude }>;
type Sender = FamilyRow["sender"];

export const BRAND_AUTHOR: FamilyAuthor = { kind: "brand", id: "brand", name: "Tayyorr.uz", login: BRAND_LOGIN, image: BRAND_IMAGE };
export const SUPPORT_AUTHOR: FamilyAuthor = { kind: "support", id: "support", name: "Tayyorr Support", login: SUPPORT_LOGIN, image: SUPPORT_IMAGE };

export function displayName(u: Pick<Sender, "firstName" | "lastName" | "name" | "login">) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || (u.login ? `@${u.login}` : "Foydalanuvçi");
}

export function authorOf(m: { as: string; sender: Sender }): FamilyAuthor {
  if (m.as === "brand") return BRAND_AUTHOR;
  if (m.as === "support") return SUPPORT_AUTHOR;
  const s = m.sender;
  return { kind: "user", id: s.id, name: displayName(s), login: s.login, image: s.avatarUrl ?? s.image ?? null };
}

/** Guruh admini: admin paneldan belgilangan akkaunt yoki support akkaunti. */
export async function familyRole(userId: string) {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { ...senderSelect, familyAdmin: true, isSupport: true, bannedUntil: true },
  });
  return { user: u, isAdmin: !!u && (u.familyAdmin || u.isSupport) };
}

export async function familyAdminIds(): Promise<string[]> {
  const rows = await db.user.findMany({ where: { OR: [{ familyAdmin: true }, { isSupport: true }] }, select: { id: true } });
  return rows.map((r) => r.id);
}

function snippet(m: Pick<FamilyMessage, "body" | "fileName" | "deletedAt">, max = 90) {
  if (m.deletedAt) return "öçirilgan xabar";
  const b = m.body.trim();
  if (b) return b.length > max ? b.slice(0, max) + "…" : b;
  if (m.fileName) return `📎 ${m.fileName}`;
  return "xabar";
}

export interface FamilyClientMessage {
  id: string;
  author: FamilyAuthor;
  /** so'rovchi o'zi yozganmi (realtime orqali kelganda — yo'q, ilova o'zi aniqlaydi) */
  mine?: boolean;
  body: string;
  file: { name: string; type: string; size: number; url: string } | null;
  /** 5 kundan eski fayl — ilovada ochilmaydi */
  expiredFile: { name: string; type: string; size: number } | null;
  replyTo: { id: string; authorName: string; text: string; deleted: boolean } | null;
  mentions: { id: string; login: string }[];
  notifyAll: boolean;
  pinned: boolean;
  scheduled: boolean;
  sendAt: number;
  updatedAt: number;
  deleted: boolean;
  /** faqat admin panel uchun */
  admin?: { senderId: string; senderName: string; senderLogin: string | null; as: string; deletedAt: number | null; createdAt: number; fileKey: string | null };
}

/** Belgilanganlar id → login (bir so'rov bilan). */
async function mentionMap(rows: { mentions: string[] }[]) {
  const ids = [...new Set(rows.flatMap((r) => r.mentions).filter((x) => x !== "brand" && x !== "support"))];
  const map = new Map<string, string>([
    ["brand", BRAND_LOGIN],
    ["support", SUPPORT_LOGIN],
  ]);
  if (ids.length) {
    const us = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, login: true } });
    for (const u of us) if (u.login) map.set(u.id, u.login);
  }
  return map;
}

export async function toFamilyClients(
  rows: FamilyRow[],
  opts: { meId?: string; forAdmin?: boolean } = {},
): Promise<FamilyClientMessage[]> {
  const logins = await mentionMap(rows);
  const now = Date.now();
  return Promise.all(
    rows.map(async (m) => {
      const deleted = !!m.deletedAt;
      const hide = deleted && !opts.forAdmin;
      const expired = !opts.forAdmin && now - m.sendAt.getTime() > FILE_TTL_MS;
      const meta = m.fileKey ? { name: m.fileName ?? "fayl", type: m.fileType ?? "application/octet-stream", size: m.fileSize ?? 0 } : null;
      const file =
        !hide && meta && !expired
          ? { ...meta, url: await presignGet({ bucket: PRIVATE_BUCKET, key: m.fileKey!, expiresIn: 6 * 3600 }) }
          : null;
      const r = m.replyTo;
      return {
        id: m.id,
        author: authorOf(m),
        ...(opts.meId ? { mine: m.senderId === opts.meId } : {}),
        body: hide ? "" : m.body,
        file,
        expiredFile: !hide && meta && expired ? meta : null,
        replyTo: r ? { id: r.id, authorName: authorOf(r).name, text: snippet(r), deleted: !!r.deletedAt } : null,
        mentions: m.mentions.map((id) => ({ id, login: logins.get(id) ?? "" })).filter((x) => x.login),
        notifyAll: m.notifyAll,
        pinned: !!m.pinnedAt && !deleted,
        scheduled: m.scheduled && m.sendAt.getTime() > now,
        sendAt: m.sendAt.getTime(),
        updatedAt: m.updatedAt.getTime(),
        deleted,
        ...(opts.forAdmin
          ? {
              admin: {
                senderId: m.sender.id,
                senderName: displayName(m.sender),
                senderLogin: m.sender.login,
                as: m.as,
                deletedAt: m.deletedAt ? m.deletedAt.getTime() : null,
                createdAt: m.createdAt.getTime(),
                fileKey: m.fileKey,
              },
            }
          : {}),
      };
    }),
  );
}

/** Matndagi @login'lar → id'lar ("brand" / "support" — maxsus). */
export async function parseMentions(body: string): Promise<string[]> {
  const tokens = [...new Set([...body.matchAll(/@([A-Za-z0-9_.]{2,40})/g)].map((m) => m[1].replace(/\.+$/, "").toLowerCase()))].slice(0, 20);
  if (!tokens.length) return [];
  const out: string[] = [];
  if (tokens.includes(BRAND_LOGIN)) out.push("brand");
  if (tokens.includes(SUPPORT_LOGIN)) out.push("support");
  const rest = tokens.filter((t) => t !== BRAND_LOGIN && t !== SUPPORT_LOGIN);
  if (rest.length) {
    const us = await db.user.findMany({
      where: { login: { in: rest, mode: "insensitive" }, isPlatform: false, isSupport: false },
      select: { id: true },
    });
    out.push(...us.map((u) => u.id));
  }
  return out;
}

/** Realtime (faqat guruh oynasi ochiqlar) — xabar mazmuni bilan, qayta so'rov kerak emas. */
export function familySignal(e: "new" | "upd" | "del", data: { id: string; m?: FamilyClientMessage }) {
  signal([FAMILY_CHANNEL], { name: "family", data: { e, id: data.id, ...(data.m ? { m: JSON.stringify(data.m) } : {}) } });
}

/** Xabar ko'rinadigan bo'lganda: realtime + kerakli bildirishnomalar (javobdan keyin, fonda). */
export async function dispatchFamily(row: FamilyRow) {
  const [client] = await toFamilyClients([row]);
  familySignal("new", { id: row.id, m: client });

  const author = authorOf(row);
  const text = snippet(row, 140);
  const senderId = row.senderId;
  const job = async () => {
    const notified = new Set<string>([senderId]);
    // @belgilanganlar (brand/support — adminlarga)
    const direct = row.mentions.filter((x) => x !== "brand" && x !== "support");
    const toAdmins = row.mentions.some((x) => x === "brand" || x === "support") ? await familyAdminIds() : [];
    const mentioned = [...new Set([...direct, ...toAdmins])].filter((id) => !notified.has(id));
    if (mentioned.length) {
      mentioned.forEach((id) => notified.add(id));
      await sendFamilyPush(mentioned, { title: `${author.name} sizni belgiladi`, body: text, messageId: row.id, kind: "mention" }).catch(() => {});
    }
    // javob — asl xabar egasiga
    const replyOwner = row.replyTo && !row.replyTo.deletedAt ? row.replyTo.senderId : null;
    if (replyOwner && !notified.has(replyOwner)) {
      notified.add(replyOwner);
      await sendFamilyPush([replyOwner], { title: `${author.name} javob yozdi`, body: text, messageId: row.id, kind: "reply" }).catch(() => {});
    }
    // admin «hammaga bildirish»
    if (row.notifyAll) {
      await sendFamilyPush("all", { title: FAMILY_NAME, body: `${author.name}: ${text}`, messageId: row.id, kind: "all" }, senderId).catch(() => {});
    }
  };
  try {
    after(job);
  } catch {
    void job();
  }
}

let lastDueCheck = 0;
/** Vaqti kelgan rejalashtirilgan xabarlarni yuboradi (cron yo'q — guruh so'rovlarida, 15 soniyada bir marta). */
export async function dispatchDueFamily() {
  if (Date.now() - lastDueCheck < 15_000) return;
  lastDueCheck = Date.now();
  const due = await db.familyMessage.findMany({
    where: { scheduled: true, dispatchedAt: null, deletedAt: null, sendAt: { lte: new Date() } },
    orderBy: { sendAt: "asc" },
    take: 20,
    include: familyInclude,
  });
  for (const m of due) {
    // ikki so'rov bir vaqtda kelsa — faqat bittasi yuboradi
    const claimed = await db.familyMessage.updateMany({ where: { id: m.id, dispatchedAt: null }, data: { dispatchedAt: new Date() } });
    if (claimed.count === 1) await dispatchFamily(m);
  }
}

/** A'zolarga ko'rinadigan xabarlar (rejalashtirilgani — vaqti kelgach). */
export const visibleFamily = (): Prisma.FamilyMessageWhereInput => ({ sendAt: { lte: new Date() } });
