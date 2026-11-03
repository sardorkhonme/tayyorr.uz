/**
 * Xabar qaysi platforma(lar)ga tegishli — matn boshidagi belgi (foydalanuvchiga ko'rsatilmaydi).
 * Admin bir nechta platformani belgilashi mumkin (checkbox), har bir to'plamning o'z belgisi bor:
 *   belgisiz      — faqat tayyorr.uz
 *   "[tayyorr+]"  — faqat tayyorr+         "[smm]"      — faqat Tayyorr SMM
 *   "[uz+plus]"   — tayyorr.uz + tayyorr+   "[uz+smm]"   — tayyorr.uz + SMM
 *   "[plus+smm]"  — tayyorr+ + SMM          "[all]"      — hammasi
 * Admin har bir xabar ostida kichik status ko'radi. Boshqa tomonlar (bir xil belgilar):
 * plus/src/lib/support.ts, smm-app/src/lib/support.ts.
 */
export type Platform = "uz" | "plus" | "smm";
export type MessageSource = "tayyorr.uz" | "tayyorr+" | "smm" | "ikkalasi" | "uz+plus" | "uz+smm" | "plus+smm";

export const MESSAGE_SOURCES = [
  "tayyorr.uz",
  "tayyorr+",
  "smm",
  "ikkalasi",
  "uz+plus",
  "uz+smm",
  "plus+smm",
] as const satisfies readonly MessageSource[];

export const PLUS_TAG = "[tayyorr+]";
export const SMM_TAG = "[smm]";
export const ALL_TAG = "[all]";

const TAGS: Record<MessageSource, string | null> = {
  "tayyorr.uz": null,
  "tayyorr+": PLUS_TAG,
  smm: SMM_TAG,
  ikkalasi: ALL_TAG,
  "uz+plus": "[uz+plus]",
  "uz+smm": "[uz+smm]",
  "plus+smm": "[plus+smm]",
};

const PLATFORMS_OF: Record<MessageSource, Platform[]> = {
  "tayyorr.uz": ["uz"],
  "tayyorr+": ["plus"],
  smm: ["smm"],
  ikkalasi: ["uz", "plus", "smm"],
  "uz+plus": ["uz", "plus"],
  "uz+smm": ["uz", "smm"],
  "plus+smm": ["plus", "smm"],
};

const TAG = /^\[(tayyorr\+|smm|all|uz\+plus|uz\+smm|plus\+smm)\]\s*/;
const BY_TAG = new Map(Object.entries(TAGS).filter(([, t]) => t).map(([s, t]) => [t as string, s as MessageSource]));

export function splitSource(body: string): { source: MessageSource; body: string } {
  const m = TAG.exec(body);
  if (!m) return { source: "tayyorr.uz", body };
  return { source: BY_TAG.get(`[${m[1]}]`) ?? "tayyorr.uz", body: body.slice(m[0].length) };
}

/** Faqat matn (ro'yxatdagi qisqa ko'rinish va h.k. uchun). */
export function stripSource(body: string): string {
  return body.replace(TAG, "");
}

/** Matnga platforma belgisini qo'yadi (admin tanlovi, ommaviy xabar va h.k.). */
export function withSource(body: string, source: MessageSource): string {
  const clean = stripSource(body);
  const tag = TAGS[source];
  return tag ? `${tag} ${clean}` : clean;
}

export function platformsOf(source: MessageSource | undefined): Platform[] {
  return PLATFORMS_OF[source ?? "tayyorr.uz"] ?? ["uz"];
}

/** Belgilangan platformalardan manba (bo'sh bo'lsa — null). */
export function sourceOf(platforms: Platform[]): MessageSource | null {
  const has = (p: Platform) => platforms.includes(p);
  const key = (["uz", "plus", "smm"] as Platform[]).filter(has).join("+");
  const map: Record<string, MessageSource> = {
    uz: "tayyorr.uz",
    plus: "tayyorr+",
    smm: "smm",
    "uz+plus+smm": "ikkalasi",
    "uz+plus": "uz+plus",
    "uz+smm": "uz+smm",
    "plus+smm": "plus+smm",
  };
  return map[key] ?? null;
}

/** tayyorr.uz da ko'rinadigan xabarlar (Prisma `where`): tayyorr.uz belgilanmaganlari yashirin. */
export const VISIBLE_ON_UZ = {
  NOT: [{ body: { startsWith: PLUS_TAG } }, { body: { startsWith: SMM_TAG } }, { body: { startsWith: "[plus+smm]" } }],
};

/** Xabar tayyorr.uz da ko'rinmaydimi (faqat boshqa platformalarga). */
export const isForeignSource = (source?: MessageSource) => !platformsOf(source).includes("uz");

export const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "uz", label: "tayyorr.uz" },
  { value: "plus", label: "tayyorr+" },
  { value: "smm", label: "Tayyorr SMM" },
];

const PLATFORM_LABEL: Record<Platform, string> = { uz: "tayyorr.uz", plus: "tayyorr+", smm: "Tayyorr SMM" };

export function sourceLabel(source: MessageSource | undefined): string {
  if (source === "ikkalasi") return "Hammasi";
  return platformsOf(source).map((p) => PLATFORM_LABEL[p]).join(" + ");
}
