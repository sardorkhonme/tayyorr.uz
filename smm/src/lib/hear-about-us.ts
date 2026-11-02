/** tayyorr.uz dagi HEAR_ABOUT_US_LABELS bilan bir xil. */
export const HEAR_ABOUT_US = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "telegram", label: "Telegram", icon: "✈️" },
  { value: "ai", label: "Suniy intellekt tavsiyasi", icon: "🤖" },
  { value: "google", label: "Google", icon: "🔎" },
  { value: "friend", label: "Do'stimdan", icon: "🤝" },
  { value: "other", label: "Boshqa", icon: "💬" },
] as const;
export type HearAboutUs = (typeof HEAR_ABOUT_US)[number]["value"];
