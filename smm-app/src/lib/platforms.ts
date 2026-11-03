export type Platform = {
  key: string;
  name: string;
  /** kategoriya/nomdan aniqlash uchun kalit so'zlar */
  match: RegExp;
  /** blok rangi (gradient) */
  from: string;
  to: string;
};

export const PLATFORMS: Platform[] = [
  { key: "instagram", name: "Instagram", match: /instagram|\big\b|\breels?\b/i, from: "#f58529", to: "#dd2a7b" },
  { key: "telegram", name: "Telegram", match: /telegram|\btg\b/i, from: "#2aabee", to: "#229ed9" },
  { key: "tiktok", name: "TikTok", match: /tik ?tok/i, from: "#25f4ee", to: "#fe2c55" },
  { key: "youtube", name: "YouTube", match: /you ?tube|\byt\b/i, from: "#ff0000", to: "#b31217" },
  { key: "facebook", name: "Facebook", match: /facebook|\bfb\b/i, from: "#1877f2", to: "#0c56c4" },
  { key: "twitter", name: "X (Twitter)", match: /twitter|\bx\.com\b/i, from: "#52525b", to: "#18181b" },
  { key: "other", name: "Boşqa", match: /.^/, from: "#6366f1", to: "#4f46e5" },
];

function match(text: string) {
  return PLATFORMS.find((p) => p.match.test(text))?.key ?? null;
}

/** Avval kategoriyadan, topilmasa nomdan ("Instant Start" kabi so'zlar adashtirmasin). */
export function detectPlatform(category: string, name = ""): string {
  return match(category) ?? match(name) ?? "other";
}

export function platformOf(key: string): Platform {
  return PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[PLATFORMS.length - 1];
}
