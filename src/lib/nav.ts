import type { NavLink } from "@/components/nav-menu";

const BASE_NAV: NavLink[] = [
  { href: "/dashboard", label: "Asosiy menyu", tkey: "nav.dashboard", icon: "home" },
  { href: "/messages", label: "Xabarlar", tkey: "nav.messages", icon: "message" },
  { href: "/wallet", label: "Hamyon", tkey: "nav.wallet", icon: "wallet" },
  { href: "/profile", label: "Profil", tkey: "nav.profile", icon: "user" },
];

/** tayyorr+ (plus.tayyorr.uz) — menyuning eng pastida alohida kartochka (TayyorrPlusCard). */
export const TAYYORR_PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

const MY_OFFERS_LINK: NavLink = {
  href: "/offers",
  label: "Mening takliflarim",
  tkey: "nav.myOffers",
  icon: "hand",
};

const REFERRAL_LINK: NavLink = {
  href: "/referral",
  label: "Referal",
  tkey: "nav.referral",
  icon: "gift",
};

/** Rolga qarab navigatsiya ro'yxati — "Mening takliflarim" va "Referal" faqat tayyorlovchiga. */
export function navForRole(role: string | null | undefined): NavLink[] {
  if (role !== "PREPARER") return BASE_NAV;
  return [BASE_NAV[0], MY_OFFERS_LINK, REFERRAL_LINK, ...BASE_NAV.slice(1)];
}

/** Orqaga moslik uchun — rolsiz joylarda standart ro'yxat. */
export const APP_NAV = BASE_NAV;
