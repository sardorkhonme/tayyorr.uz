import type { IconName } from "@/components/icons";

export type HubLink = {
  href: string;
  label: string;
  icon: IconName;
  /** ikonka o'rniga xizmatning o'z logotipi (public/ dagi rasm) */
  image?: string;
  /** faqat hisobga kirganlarga */
  auth?: boolean;
  /** boshqa sayt (tayyorr.uz) */
  external?: boolean;
  /** faqat telefon/planshet menyusida (kompyuterda support — popup) */
  mobileOnly?: boolean;
};

/** tayyorr.uz kabineti (ilmiy ishlar) — app.tayyorr.uz; tayyorr.uz o'zi faqat landing. */
/** Tayyorr SMM — alohida sayt (smm-app/ papkasi). */
export const SMM_URL = (process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz").replace(/\/+$/, "");

export const MAIN_SITE_URL = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz"}/dashboard`;

/** tayyorr+ navigatsiyasi — asosiy panel: faqat eng kerakli bo'limlar. */
export const HUB_NAV: HubLink[] = [
  { href: "/", label: "Asosiy", icon: "home" },
  { href: "/wallet", label: "Hamyon", icon: "wallet", auth: true },
  { href: "/account", label: "Hisoblar", icon: "users", auth: true },
  { href: "/qollanma", label: "Qöllanma", icon: "book" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
