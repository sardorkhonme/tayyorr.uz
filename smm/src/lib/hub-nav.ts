export type HubLink = {
  href: string;
  label: string;
  icon: string;
  /** faqat hisobga kirganlarga */
  auth?: boolean;
  /** boshqa sayt (tayyorr.uz) */
  external?: boolean;
};

export const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://tayyorr.uz";

/** tayyorr+ navigatsiyasi — yangi xizmat qo'shilsa shu ro'yxatga qo'shiladi. */
export const HUB_NAV: HubLink[] = [
  { href: "/", label: "Asosiy", icon: "🏠" },
  { href: "/smm", label: "Tayyorr SMM", icon: "🚀" },
  { href: "/orders", label: "Buyurtmalarim", icon: "📦", auth: true },
  { href: MAIN_SITE_URL, label: "tayyorr.uz", icon: "↗", external: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
