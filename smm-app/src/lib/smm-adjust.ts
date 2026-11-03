/**
 * Admin paneldan xizmatlar bo'yicha narx tuzatish (chegirma / ustama) va yashirish.
 * AppSetting "smmAdjust" da JSON bo'lib turadi. Bu fayl admin/src/lib/smm-adjust.ts bilan bir xil.
 *
 * - groups: "<platforma>:<tur>" (masalan "instagram:views") → foiz (−90 … +500)
 * - services: providerId → { pct?, off? } — guruh foizidan ustun turadi; off — saytda ko'rinmaydi
 *
 * Yakuniy narx = asosiy narx (kurs × umumiy ustama) × (1 + foiz/100).
 */
export const ADJUST_KEY = "smmAdjust";
export const ADJUST_MIN = -90;
export const ADJUST_MAX = 500;

export type ServiceAdjust = { pct?: number; off?: boolean };
export type Adjust = { groups: Record<string, number>; services: Record<string, ServiceAdjust> };

export const EMPTY_ADJUST: Adjust = { groups: {}, services: {} };

/** Xizmat turlari (kinds.ts dagi qoidalar bilan bir xil — admin ham shu bilan guruhlaydi). */
export const KIND_RULES: { key: string; label: string; match: RegExp }[] = [
  { key: "followers", label: "Obunaçilar", match: /follow|member|subscri|obuna/i },
  { key: "views", label: "Körişlar", match: /view|impression|watch|reach|plays?\b/i },
  { key: "likes", label: "Layk va reaksiyalar", match: /like|heart|reaction|react/i },
  { key: "comments", label: "Izohlar", match: /comment/i },
  { key: "shares", label: "Ulaşiş va saqlaş", match: /share|save|repost|retweet/i },
  { key: "other", label: "Boşqa", match: /.^/ },
];

function matchKind(text: string) {
  return KIND_RULES.find((k) => k.key !== "other" && k.match.test(text))?.key ?? null;
}

/** Avval xizmat nomidan, topilmasa kategoriyadan. */
export function kindKey(category: string, name: string): string {
  return matchKind(name) ?? matchKind(category) ?? "other";
}

export const groupKey = (platform: string, kind: string) => `${platform}:${kind}`;

const clampPct = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(ADJUST_MAX, Math.max(ADJUST_MIN, Math.round(v * 10) / 10)) : null;
};

/** Bazadagi qiymatni xavfsiz o'qiydi (noto'g'ri qiymatlar tashlab yuboriladi). */
export function parseAdjust(raw: unknown): Adjust {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { groups: {}, services: {} };
    }
  }
  const out: Adjust = { groups: {}, services: {} };
  if (!obj || typeof obj !== "object") return out;
  const o = obj as { groups?: unknown; services?: unknown };
  if (o.groups && typeof o.groups === "object") {
    for (const [k, v] of Object.entries(o.groups)) {
      const p = clampPct(v);
      if (p !== null && p !== 0 && k.length <= 60) out.groups[k] = p;
    }
  }
  if (o.services && typeof o.services === "object") {
    for (const [k, v] of Object.entries(o.services)) {
      if (!/^\d+$/.test(k) || !v || typeof v !== "object") continue;
      const sv = v as ServiceAdjust;
      const entry: ServiceAdjust = {};
      const p = sv.pct === undefined || sv.pct === null ? null : clampPct(sv.pct);
      if (p !== null) entry.pct = p;
      if (sv.off === true) entry.off = true;
      if (entry.pct !== undefined || entry.off) out.services[k] = entry;
    }
  }
  return out;
}

export type ServiceRef = { providerId: number; platform: string; category: string; name: string };

/** Xizmatga tegishli foiz: avval xizmatning o'zi, bo'lmasa guruhi. */
export function adjustPct(adj: Adjust, s: ServiceRef): number {
  const own = adj.services[String(s.providerId)]?.pct;
  if (own !== undefined) return own;
  return adj.groups[groupKey(s.platform, kindKey(s.category, s.name))] ?? 0;
}

export function isHidden(adj: Adjust, s: Pick<ServiceRef, "providerId">): boolean {
  return adj.services[String(s.providerId)]?.off === true;
}
