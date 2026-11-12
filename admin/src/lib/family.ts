import { after } from "next/server";
import type { FamilyMessage, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { sendFamilyPush } from "@/lib/fcm";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { FAMILY_CHANNEL, signal } from "@/lib/realtime";

/**
 * «Tayyorr's Family» — admin panel tomoni (src/lib/family.ts dan ko'chirilgan qism).
 * Admin guruhda faqat «Tayyorr Support» nomidan yozadi: senderId = support akkaunti, as = "support".
 * Xabar formati, realtime signal va push — ilova bilan bir xil (src/lib/family.ts).
 */
export const FAMILY_NAME = "Tayyorr’s Family";
/** Ruxsat etilgan reaksiyalar (ilovadagi tanlov bilan bir xil). */
export const FAMILY_EMOJIS = ["👍", "👎", "💖", "😂", "😮", "😢", "😡", "🔥", "🙏", "👏"];
const APP_URL = "https://app.tayyorr.uz";

export const BRAND_LOGIN = "tayyorr.uz";
export const SUPPORT_LOGIN = "tayyorr_support";

export type AuthorKind = "user" | "brand" | "support";

export interface FamilyAuthor {
  kind: AuthorKind;
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
  reactions: { select: { userId: true, emoji: true }, orderBy: { createdAt: "asc" as const } },
  replyTo: { include: { sender: { select: senderSelect } } },
} satisfies Prisma.FamilyMessageInclude;

export type FamilyRow = Prisma.FamilyMessageGetPayload<{ include: typeof familyInclude }>;
type Sender = FamilyRow["sender"];

const BRAND_AUTHOR: FamilyAuthor = { kind: "brand", id: "brand", name: "Tayyorr.uz", login: BRAND_LOGIN, image: `${APP_URL}/icon-192.png` };
const SUPPORT_AUTHOR: FamilyAuthor = { kind: "support", id: "support", name: "Tayyorr Support", login: SUPPORT_LOGIN, image: `${APP_URL}/logo-mark.png` };

export function displayName(u: Pick<Sender, "firstName" | "lastName" | "name" | "login">) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || (u.login ? `@${u.login}` : "Foydalanuvçi");
}

const BRAND_PROFILE_KEY = "family.brand";
type FamilyAuthors = { brand: FamilyAuthor; support: FamilyAuthor };
let authorsCache: { at: number; v: FamilyAuthors } | null = null;

/** Tayyorr.uz va Tayyorr Support ko'rinishi (nomi, rasmi) — 1 daqiqa keshlanadi. */
export async function familyAuthors(): Promise<FamilyAuthors> {
  if (authorsCache && Date.now() - authorsCache.at < 60_000) return authorsCache.v;
  const [setting, sup] = await Promise.all([
    db.appSetting.findUnique({ where: { key: BRAND_PROFILE_KEY } }).catch(() => null),
    db.user.findFirst({ where: { isSupport: true }, select: { name: true, avatarUrl: true, image: true } }),
  ]);
  let b: { name?: string; avatarUrl?: string } = {};
  try {
    b = JSON.parse(setting?.value ?? "{}");
  } catch {
    /* bo'sh */
  }
  const v: FamilyAuthors = {
    brand: { ...BRAND_AUTHOR, name: b.name?.trim() || BRAND_AUTHOR.name, image: b.avatarUrl || BRAND_AUTHOR.image },
    support: { ...SUPPORT_AUTHOR, name: sup?.name?.trim() || SUPPORT_AUTHOR.name, image: sup?.avatarUrl ?? sup?.image ?? SUPPORT_AUTHOR.image },
  };
  authorsCache = { at: Date.now(), v };
  return v;
}

function authorOf(m: { as: string; sender: Sender }, a: FamilyAuthors): FamilyAuthor {
  if (m.as === "brand") return a.brand;
  if (m.as === "support") return a.support;
  const s = m.sender;
  return { kind: "user", id: s.id, name: displayName(s), login: s.login, image: s.avatarUrl ?? s.image ?? null };
}

async function familyAdminIds(): Promise<string[]> {
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

/** Ilova kutadigan format (src/lib/family.ts → FamilyClientMessage bilan bir xil). */
export interface FamilyClientMessage {
  id: string;
  author: FamilyAuthor;
  mine?: boolean;
  body: string;
  file: { name: string; type: string; size: number; url: string } | null;
  expiredFile: { name: string; type: string; size: number } | null;
  replyTo: { id: string; authorName: string; text: string; deleted: boolean } | null;
  mentions: { id: string; login: string }[];
  reactions: { emoji: string; count: number; users: string[] }[];
  seen: number;
  notifyAll: boolean;
  pinned: boolean;
  scheduled: boolean;
  sendAt: number;
  updatedAt: number;
  deleted: boolean;
  edited: boolean;
  clientId?: string;
  by?: { id: string; name: string; login: string | null };
  admin?: {
    senderId: string;
    senderName: string;
    senderLogin: string | null;
    as: string;
    deletedAt: number | null;
    deletedByName: string | null;
    createdAt: number;
    editHistory: string[];
  };
}

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

function reactionSummary(rs: { userId: string; emoji: string }[]) {
  const map = new Map<string, string[]>();
  for (const r of rs) map.set(r.emoji, [...(map.get(r.emoji) ?? []), r.userId]);
  return [...map.entries()].map(([emoji, users]) => ({ emoji, count: users.length, users: users.slice(0, 50) }));
}

async function seenCounter(rows: FamilyRow[]) {
  if (!rows.length) return () => 0;
  const members = await db.familyMember.findMany({ select: { userId: true, lastReadAt: true } });
  const times = members.map((m) => m.lastReadAt.getTime()).sort((a, b) => a - b);
  const readAt = new Map(members.map((m) => [m.userId, m.lastReadAt.getTime()]));
  return (m: FamilyRow) => {
    const t = m.sendAt.getTime();
    let lo = 0;
    let hi = times.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] >= t) hi = mid;
      else lo = mid + 1;
    }
    const n = times.length - lo;
    const self = (readAt.get(m.senderId) ?? 0) >= t ? 1 : 0;
    return Math.max(0, n - self);
  };
}

/**
 * Xabarlarni ilova formatiga o'tkazadi. `forAdmin` — o'chirilganlari ham to'liq, fayllar doimiy,
 * qo'shimcha `admin` maydoni (aslida kim yozgan, kim o'chirgan, oldingi matnlar).
 */
export async function toFamilyClients(
  rows: FamilyRow[],
  opts: { forAdmin?: boolean; noSeen?: boolean } = {},
): Promise<FamilyClientMessage[]> {
  const [logins, authors, seenOf] = await Promise.all([
    mentionMap(rows),
    familyAuthors(),
    opts.noSeen ? Promise.resolve(() => 0) : seenCounter(rows),
  ]);
  const delIds = opts.forAdmin ? [...new Set(rows.map((r) => r.deletedById).filter((x): x is string => !!x))] : [];
  const deleters = new Map(
    (delIds.length ? await db.user.findMany({ where: { id: { in: delIds } }, select: senderSelect }) : []).map((u) => [u.id, u]),
  );
  const now = Date.now();
  const FILE_TTL_MS = 5 * 24 * 3600 * 1000;
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
      const delBy = m.deletedById ? deleters.get(m.deletedById) : null;
      return {
        id: m.id,
        author: authorOf(m, authors),
        body: hide ? "" : m.body,
        file,
        expiredFile: !hide && meta && expired ? meta : null,
        replyTo: r ? { id: r.id, authorName: authorOf(r, authors).name, text: snippet(r), deleted: !!r.deletedAt } : null,
        mentions: m.mentions.map((id) => ({ id, login: logins.get(id) ?? "" })).filter((x) => x.login),
        reactions: hide ? [] : reactionSummary(m.reactions),
        seen: seenOf(m),
        notifyAll: m.notifyAll,
        pinned: !!m.pinnedAt && !deleted,
        scheduled: m.scheduled && m.sendAt.getTime() > now,
        sendAt: m.sendAt.getTime(),
        updatedAt: m.updatedAt.getTime(),
        deleted,
        edited: !!m.editedAt,
        ...(opts.forAdmin
          ? {
              admin: {
                senderId: m.sender.id,
                senderName: displayName(m.sender),
                senderLogin: m.sender.login,
                as: m.as,
                deletedAt: m.deletedAt ? m.deletedAt.getTime() : null,
                deletedByName: delBy ? (delBy.id === m.senderId ? "özi" : displayName(delBy)) : null,
                createdAt: m.createdAt.getTime(),
                editHistory: m.editHistory,
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

/** Realtime (ilovada guruh oynasi ochiqlar) — xabar mazmuni bilan. */
export function familySignal(e: "new" | "upd" | "del", data: { id: string; m?: FamilyClientMessage }) {
  signal([FAMILY_CHANNEL], { name: "family", data: { e, id: data.id, ...(data.m ? { m: JSON.stringify(data.m) } : {}) } });
}

/** Xabar ko'rinadigan bo'lganda: realtime + bildirishnomalar (ilovadagi bilan bir xil). */
export async function dispatchFamily(row: FamilyRow) {
  const [client] = await toFamilyClients([row], { noSeen: true });
  familySignal("new", { id: row.id, m: client });

  const author = client.author;
  const text = snippet(row, 140);
  const senderId = row.senderId;
  const job = async () => {
    const notified = new Set<string>([senderId]);
    const direct = row.mentions.filter((x) => x !== "brand" && x !== "support");
    const toAdmins = row.mentions.some((x) => x === "brand" || x === "support") ? await familyAdminIds() : [];
    const mentioned = [...new Set([...direct, ...toAdmins])].filter((id) => !notified.has(id));
    if (mentioned.length) {
      mentioned.forEach((id) => notified.add(id));
      await sendFamilyPush(mentioned, { title: `${author.name} sizni belgiladi`, body: text, messageId: row.id, kind: "mention" }).catch(() => {});
    }
    const replyOwner = row.replyTo && !row.replyTo.deletedAt ? row.replyTo.senderId : null;
    if (replyOwner && !notified.has(replyOwner)) {
      notified.add(replyOwner);
      await sendFamilyPush([replyOwner], { title: `${author.name} javob yozdi`, body: text, messageId: row.id, kind: "reply" }).catch(() => {});
    }
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
/** Vaqti kelgan rejalashtirilgan xabarlarni yuboradi (15 soniyada bir marta). */
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
    const claimed = await db.familyMessage.updateMany({ where: { id: m.id, dispatchedAt: null }, data: { dispatchedAt: new Date() } });
    if (claimed.count === 1) await dispatchFamily(m);
  }
}

/** Guruh a'zolari va hozir onlayn (so'nggi 2 daqiqada faol) bo'lganlar soni. */
export async function familyPresence() {
  const since = new Date(Date.now() - 2 * 60_000);
  const [members, online] = await Promise.all([
    db.familyMember.count(),
    db.familyMember.count({ where: { user: { lastSeenAt: { gte: since } } } }),
  ]);
  return { members, online };
}
