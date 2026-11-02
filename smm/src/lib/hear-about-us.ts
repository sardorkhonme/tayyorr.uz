/** tayyorr.uz dagi HEAR_ABOUT_US_LABELS bilan bir xil. */
export const HEAR_ABOUT_US = [
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "ai", label: "Suniy intellekt tavsiyasi" },
  { value: "google", label: "Google" },
  { value: "friend", label: "Do'stimdan" },
  { value: "other", label: "Boshqa" },
] as const;
export type HearAboutUs = (typeof HEAR_ABOUT_US)[number]["value"];
