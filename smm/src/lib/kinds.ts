/** Xizmat turlari — provayder kategoriyasi/nomidan aniqlanadi (birinchi mos kelgani). */
export type Kind = { key: string; label: string; hint: string; match: RegExp };

export const KINDS: Kind[] = [
  { key: "followers", label: "Obunachilar", hint: "Sahifa yoki kanalga yangi obunachilar", match: /follow|member|subscri|obuna/i },
  { key: "views", label: "Ko'rishlar", hint: "Video, post va story ko'rishlari", match: /view|impression|watch|reach|plays?\b/i },
  { key: "likes", label: "Layk va reaksiyalar", hint: "Post va videolarga layklar", match: /like|heart|reaction|react/i },
  { key: "comments", label: "Izohlar", hint: "Postlar ostiga izohlar", match: /comment/i },
  { key: "shares", label: "Ulashish va saqlash", hint: "Repost, ulashish, saqlash", match: /share|save|repost|retweet/i },
  { key: "other", label: "Boshqa", hint: "Qolgan xizmatlar", match: /.^/ },
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
