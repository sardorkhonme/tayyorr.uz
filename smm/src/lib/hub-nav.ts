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
export const MAIN_SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tayyorr.uz";

/** tayyorr+ navigatsiyasi — yangi xizmat qo'shilsa shu ro'yxatga qo'shiladi. */
export const HUB_NAV: HubLink[] = [
  { href: "/", label: "Asosiy", icon: "home" },
  { href: "/smm", label: "Tayyorr SMM", icon: "rocket", image: "/smm-mark.png" },
  { href: "/orders", label: "Buyurtmalarim", icon: "package", auth: true },
  { href: "/wallet", label: "Hamyon", icon: "wallet", auth: true },
  { href: "/support", label: "Yordam", icon: "headset", mobileOnly: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
