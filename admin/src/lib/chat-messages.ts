import type { Message, MessageReaction } from "@prisma/client";
import { splitSource, stripSource, type MessageSource } from "@/lib/message-source";
import { db } from "@/lib/db";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { legacySummary, reactionChips, type ReactionChip } from "@/lib/reactions";

type WithReactions = Message & { reactions?: MessageReaction[] };

export interface ReplyPreview {
  id: string;
  authorId: string;
  text: string;
  deleted: boolean;
}

export interface ClientMessage {
  id: string;
  senderId: string;
  body: string;
  /** qaysi tizimdan yozilgan — faqat admin ko'rinishida ko'rsatiladi */
  source: MessageSource;
  system: boolean;
  /** tizim xabari tegishli buyurtma */
  orderId: string | null;
  /** xabar ostidagi tugma (masalan "Hisobni ko'rish") */
  action: { url: string; label: string } | null;
  createdAt: number;
  updatedAt: number;
  mine: boolean;
  edited: boolean;
  deleted: boolean;
  readAt: number | null;
  replyTo: ReplyPreview | null;
  /** emoji reaksiyalar (Family'dagidek) — [{ emoji, count, mine, users }] */
  reactions: ReactionChip[];
  file: null | {
    name: string;
    type: string;
    size: number;
    url: string; // vaqtinchalik presigned GET
  };
}

function snippet(m: {
  body: string;
  fileName: string | null;
  deletedAt: Date | null;
}): string {
  if (m.deletedAt) return "öçirilgan xabar";
  const body = stripSource(m.body);
  if (body) return body.length > 90 ? body.slice(0, 90) + "…" : body;
  if (m.fileName) return `📎 ${m.fileName}`;
  return "xabar";
}

async function replyPreview(replyToId: string | null): Promise<ReplyPreview | null> {
  if (!replyToId) return null;
  const p = await db.message.findUnique({
    where: { id: replyToId },
    select: { id: true, senderId: true, body: true, fileName: true, deletedAt: true },
  });
  if (!p) return null;
  return { id: p.id, authorId: p.senderId, text: snippet(p), deleted: !!p.deletedAt };
}

/**
 * DB message -> klientga yuboriladigan shakl (fayl bo'lsa presigned URL bilan).
 * forAdmin=true bo'lsa o'chirilgan xabar mazmuni ham qaytariladi.
 */
export async function toClientMessage(
  m: Message,
  meId: string,
  opts: { forAdmin?: boolean } = {},
): Promise<ClientMessage> {
  const deleted = !!m.deletedAt;
  const hideContent = deleted && !opts.forAdmin;

  let file: ClientMessage["file"] = null;
  if (!hideContent && m.fileKey) {
    file = {
      name: m.fileName ?? "fayl",
      type: m.fileType ?? "application/octet-stream",
      size: m.fileSize ?? 0,
      url: await presignGet({ bucket: PRIVATE_BUCKET, key: m.fileKey, expiresIn: 3600 }),
    };
  }

  const { source, body } = splitSource(m.body);
  return {
    id: m.id,
    senderId: m.senderId,
    body: hideContent ? "" : body,
    source,
    system: m.system,
    orderId: m.orderId,
    action: m.actionUrl ? { url: m.actionUrl, label: m.actionLabel ?? "Köriş" } : null,
    createdAt: m.createdAt.getTime(),
    updatedAt: m.updatedAt.getTime(),
    mine: m.senderId === meId,
    edited: !!m.editedAt,
    deleted,
    readAt: m.readAt ? m.readAt.getTime() : null,
    replyTo: await replyPreview(m.replyToId),
    reactions: deleted && !opts.forAdmin ? [] : reactionChips((m as WithReactions).reactions, meId),
    file,
  };
}

export function toClientMessages(
  list: Message[],
  meId: string,
  opts: { forAdmin?: boolean } = {},
) {
  return Promise.all(list.map((m) => toClientMessage(m, meId, opts)));
}

/**
 * Mobil ilova uchun: eski ilovalar (1.11 gacha) `reactions` ni { like, dislike, mine } deb o'qiydi —
 * shuning uchun u o'z shaklida qoladi, emoji reaksiyalar esa `emojiReactions` da.
 */
export function toMobileMessage(m: ClientMessage) {
  return { ...m, reactions: legacySummary(m.reactions), emojiReactions: m.reactions };
}

/** SSE bus uchun (mine'siz). O'chirilgan xabar mazmunsiz. */
export async function toSerializedMessage(m: Message) {
  const deleted = !!m.deletedAt;
  let file = null as null | { name: string; type: string; size: number; url: string };
  if (!deleted && m.fileKey) {
    file = {
      name: m.fileName ?? "fayl",
      type: m.fileType ?? "application/octet-stream",
      size: m.fileSize ?? 0,
      url: await presignGet({ bucket: PRIVATE_BUCKET, key: m.fileKey, expiresIn: 3600 }),
    };
  }
  const { source, body } = splitSource(m.body);
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: deleted ? "" : body,
    source,
    system: m.system,
    orderId: m.orderId,
    action: m.actionUrl ? { url: m.actionUrl, label: m.actionLabel ?? "Köriş" } : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    edited: !!m.editedAt,
    deleted,
    replyTo: await replyPreview(m.replyToId),
    file,
  };
}
