/**
 * Xabar reaksiyalari — brauzer uchun ham xavfsiz qism (bazasiz). Server qismi: lib/reactions.ts.
 * Ro'yxat «Tayyorr's Family» guruhidagi (lib/family.ts → FAMILY_EMOJIS) va ilovadagi bilan bir xil.
 * Bir xil fayl to'rt loyihada: src, admin, plus, smm-app (lib/reaction-emojis.ts).
 */
export const REACTION_EMOJIS = ["👍", "👎", "💖", "😂", "😮", "😢", "😡", "🔥", "🙏", "👏"];

/** Xabar ostidagi reaksiya: emoji, soni, men bosganmi va bosganlar id'lari (50 tagacha). */
export interface ReactionChip {
  emoji: string;
  count: number;
  mine: boolean;
  users?: string[];
}

/**
 * Optimistik yangilash (Family'dagidek): o'sha emoji qayta bosilsa — olib tashlanadi,
 * boshqasi bosilsa — eskisi o'rniga yangisi; `null` — olib tashlash.
 */
export function toggleReaction(chips: ReactionChip[] | undefined, emoji: string | null, meId?: string): ReactionChip[] {
  const list = chips ?? [];
  const cur = list.find((c) => c.mine)?.emoji ?? null;
  const next = emoji === cur ? null : emoji;
  const out = list
    .map((c) =>
      c.mine
        ? { ...c, mine: false, count: c.count - 1, users: c.users?.filter((u) => u !== meId) }
        : c,
    )
    .filter((c) => c.count > 0);
  if (next) {
    const i = out.findIndex((c) => c.emoji === next);
    if (i >= 0) {
      out[i] = { ...out[i], mine: true, count: out[i].count + 1, users: meId ? [...(out[i].users ?? []), meId] : out[i].users };
    } else {
      out.push({ emoji: next, count: 1, mine: true, users: meId ? [meId] : [] });
    }
  }
  const rank = (e: string) => {
    const k = REACTION_EMOJIS.indexOf(e);
    return k === -1 ? 99 : k;
  };
  return out.sort((a, b) => rank(a.emoji) - rank(b.emoji));
}

/** Real-time hodisasidagi reaksiyalar ({ emoji, count, users }) → «mine» bilan. */
export function withMine(rs: { emoji: string; count: number; users?: string[] }[] | undefined, meId: string): ReactionChip[] {
  return (rs ?? []).map((r) => ({ ...r, mine: !!r.users?.includes(meId) }));
}
