/** Xizmat turlari — provayder kategoriyasi/nomidan aniqlanadi (birinchi mos kelgani). */
import type { IconName } from "@/components/icons";

export type Kind = { key: string; label: string; hint: string; icon: IconName; color: string; match: RegExp };

export const KINDS: Kind[] = [
  { key: "followers", label: "Obunaçilar", hint: "Sahifa yoki kanalga yangi obunaçilar", icon: "users", color: "#6366f1", match: /follow|member|subscri|obuna/i },
  { key: "views", label: "Körişlar", hint: "Video, post va story körişlari", icon: "eye", color: "#0ea5e9", match: /view|impression|watch|reach|plays?\b/i },
  { key: "likes", label: "Layk va reaksiyalar", hint: "Post va videolarga layklar", icon: "heart", color: "#ec4899", match: /like|heart|reaction|react/i },
  { key: "comments", label: "Izohlar", hint: "Postlar ostiga izohlar", icon: "message", color: "#f59e0b", match: /comment/i },
  { key: "shares", label: "Ulaşiş va saqlaş", hint: "Repost, ulaşiş, saqlaş", icon: "share", color: "#10b981", match: /share|save|repost|retweet/i },
  { key: "other", label: "Boşqa", hint: "Qolgan xizmatlar", icon: "grid", color: "#8b5cf6", match: /.^/ },
];

function match(text: string) {
  return KINDS.find((k) => k.key !== "other" && k.match.test(text))?.key ?? null;
}

/** Avval xizmat nomidan (aniqroq), topilmasa kategoriyadan. */
export function kindOf(category: string, name: string): string {
  return match(name) ?? match(category) ?? "other";
}

/** Havola maydoni uchun platformaga mos misol. */
export const LINK_HINTS: Record<string, string> = {
  instagram: "https://instagram.com/username yoki post havolasi",
  telegram: "https://t.me/kanal_nomi yoki post havolasi",
  tiktok: "https://tiktok.com/@username yoki video havolasi",
  youtube: "https://youtube.com/watch?v=… yoki kanal havolasi",
  facebook: "https://facebook.com/sahifa yoki post havolasi",
  twitter: "https://x.com/username yoki post havolasi",
  other: "https://…",
};

/**
 * Provayder nomini ko'rinish uchun ajratadi:
 * "Instagram Followers [Bot Mix] [Speed: 50K/Day] | Max 100K" →
 * { title: "Instagram Followers", tags: ["Bot Mix", "Speed: 50K/Day", "Max 100K"] }
 */
export function splitServiceName(name: string): { title: string; tags: string[] } {
  const tags: string[] = [];
  let title = name.replace(/\[([^\]]+)\]/g, (_, t: string) => {
    tags.push(t);
    return " ";
  });
  const pipe = title.split("|");
  title = pipe.shift() ?? "";
  tags.push(...pipe);
  // provayder nomidagi emoji va bezaklarni olib tashlaymiz (🚀 ⚠️ ⭐ va h.k.)
  const clean = (t: string) =>
    t
      .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, "")
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–—|:•]+|[\s\-–—|:•]+$/g, "")
      .trim();
  return {
    title: clean(title) || clean(name),
    tags: tags.map(clean).filter((t) => t.length > 0 && t.length <= 40),
  };
}
