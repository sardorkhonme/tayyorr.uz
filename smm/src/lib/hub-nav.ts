import type { IconName } from "@/components/icons";

export type HubLink = {
  href: string;
  label: string;
  icon: IconName;
  /** faqat hisobga kirganlarga */
  auth?: boolean;
  /** boshqa sayt (tayyorr.uz) */
  external?: boolean;
};

export const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://tayyorr.uz";

/** tayyorr+ navigatsiyasi — yangi xizmat qo'shilsa shu ro'yxatga qo'shiladi. */
export const HUB_NAV: HubLink[] = [
  { href: "/", label: "Asosiy", icon: "home" },
  { href: "/smm", label: "Tayyorr SMM", icon: "rocket" },
  { href: "/orders", label: "Buyurtmalarim", icon: "package", auth: true },
  { href: "/wallet", label: "Hamyon", icon: "wallet", auth: true },
  { href: "/support", label: "Yordam", icon: "headset" },
  { href: MAIN_SITE_URL, label: "tayyorr.uz", icon: "external", external: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
