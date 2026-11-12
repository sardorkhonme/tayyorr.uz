import { db } from "@/lib/db";
import { REACTION_EMOJIS, type ReactionChip } from "@/lib/reaction-emojis";

export { REACTION_EMOJIS, type ReactionChip };

/**
 * Xabar reaksiyalari — «Tayyorr's Family» guruhidagidek: bitta odam bitta xabarga bitta emoji;
 * boshqasini bossa — almashadi, o'shani qayta bossa — olib tashlanadi.
 * Bazada (MessageReaction.value) emojining o'zi saqlanadi; eski "LIKE" / "DISLIKE" — 👍 / 👎 deb o'qiladi.
 * Bir xil fayl to'rt loyihada: src, admin, plus, smm-app (lib/reactions.ts).
 */

const LEGACY: Record<string, string> = { LIKE: "👍", DISLIKE: "👎" };
export const toEmoji = (v: string) => LEGACY[v] ?? v;

/** Reaksiyalarni emoji bo'yicha guruhlaydi (tartib — tanlov panelidagidek). */
export function reactionChips(
  rs: { userId: string; value: string }[] | undefined,
  meId?: string | null,
): (ReactionChip & { users: string[] })[] {
  const map = new Map<string, string[]>();
  for (const r of rs ?? []) {
    const e = toEmoji(r.value);
    map.set(e, [...(map.get(e) ?? []), r.userId]);
  }
  const rank = (e: string) => {
    const i = REACTION_EMOJIS.indexOf(e);
    return i === -1 ? 99 : i;
  };
  return [...map.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([emoji, users]) => ({ emoji, count: users.length, mine: !!meId && users.includes(meId), users: users.slice(0, 50) }));
}

/** Eski ilova (1.11 gacha) uchun: { like, dislike, mine: "LIKE" | "DISLIKE" | null }. */
export function legacySummary(chips: ReactionChip[]) {
  const mine = chips.find((c) => c.mine)?.emoji;
  return {
    like: chips.find((c) => c.emoji === "👍")?.count ?? 0,
    dislike: chips.find((c) => c.emoji === "👎")?.count ?? 0,
    mine: mine === "👍" ? "LIKE" : mine === "👎" ? "DISLIKE" : null,
  } as { like: number; dislike: number; mine: "LIKE" | "DISLIKE" | null };
}

/**
 * So'rov tanasi: yangi — { emoji: "🔥" | null } (o'sha emoji qayta bosilsa olib tashlanadi);
 * eski — { value: "LIKE" | "DISLIKE" | null } (aniq qiymat, almashtirmaydi).
 */
export function parseReactionInput(body: unknown): { emoji: string | null; toggle: boolean } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { emoji?: unknown; value?: unknown };
  if ("emoji" in b) {
    if (b.emoji === null) return { emoji: null, toggle: false };
    if (typeof b.emoji === "string" && REACTION_EMOJIS.includes(b.emoji)) return { emoji: b.emoji, toggle: true };
    return null;
  }
  if (b.value === null) return { emoji: null, toggle: false };
  if (b.value === "LIKE" || b.value === "DISLIKE") return { emoji: LEGACY[b.value], toggle: false };
  return null;
}

/**
 * Reaksiyani yozadi va xabarning updatedAt'ini yangilaydi (polling / `since` bilan so'raganlar ham olsin).
 * Natija — xabarning barcha reaksiyalari.
 */
export async function applyReaction(messageId: string, userId: string, input: { emoji: string | null; toggle: boolean }) {
  const key = { messageId_userId: { messageId, userId } };
  const cur = await db.messageReaction.findUnique({ where: key, select: { value: true } });
  const remove = !input.emoji || (input.toggle && cur && toEmoji(cur.value) === input.emoji);
  if (remove) {
    if (cur) await db.messageReaction.delete({ where: key }).catch(() => {});
  } else {
    await db.messageReaction.upsert({
      where: key,
      update: { value: input.emoji!, createdAt: new Date() },
      create: { messageId, userId, value: input.emoji! },
    });
  }
  await db.message.update({ where: { id: messageId }, data: { updatedAt: new Date() } });
  return db.messageReaction.findMany({ where: { messageId }, orderBy: { createdAt: "asc" }, select: { userId: true, value: true } });
}

/** Reaksiya so'roviga javob: yangi (reactions) + eski ilova uchun (like, dislike, mine). */
export function reactionResponse(rows: { userId: string; value: string }[], meId: string) {
  const reactions = reactionChips(rows, meId);
  return { reactions, emoji: reactions.find((c) => c.mine)?.emoji ?? null, ...legacySummary(reactions) };
}
