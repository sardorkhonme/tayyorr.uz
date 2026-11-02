import type { NavLink } from "@/components/nav-menu";

const BASE_NAV: NavLink[] = [
  { href: "/dashboard", label: "Asosiy menyu", tkey: "nav.dashboard", icon: "🏠" },
  { href: "/messages", label: "Xabarlar", tkey: "nav.messages", icon: "💬" },
  { href: "/wallet", label: "Hamyon", tkey: "nav.wallet", icon: "💳" },
  { href: "/profile", label: "Profil", tkey: "nav.profile", icon: "👤" },
];

/** tayyorr+ (smm.tayyorr.uz) — umumiy hisob va hamyon bilan qo'shimcha xizmatlar. */
const TAYYORR_PLUS_LINK: NavLink = {
  href: process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://smm.tayyorr.uz",
  label: "tayyorr+",
  icon: "✨",
};

const MY_OFFERS_LINK: NavLink = {
  href: "/offers",
  label: "Mening takliflarim",
  tkey: "nav.myOffers",
  icon: "🙋",
};

const REFERRAL_LINK: NavLink = {
  href: "/referral",
  label: "Referal",
  tkey: "nav.referral",
  icon: "🎁",
};

/** Rolga qarab navigatsiya ro'yxati — "Mening takliflarim" va "Referal" faqat tayyorlovchiga. */
export function navForRole(role: string | null | undefined): NavLink[] {
  // tayyorr+ — "Asosiy menyu"dan keyin, ko'zga tashlanib tursin
  if (role !== "PREPARER") return [BASE_NAV[0], TAYYORR_PLUS_LINK, ...BASE_NAV.slice(1)];
  return [BASE_NAV[0], TAYYORR_PLUS_LINK, MY_OFFERS_LINK, REFERRAL_LINK, ...BASE_NAV.slice(1)];
}

/** Orqaga moslik uchun — rolsiz joylarda standart ro'yxat. */
export const APP_NAV = BASE_NAV;
