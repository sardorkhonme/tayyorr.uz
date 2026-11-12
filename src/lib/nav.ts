import type { NavLink } from "@/components/nav-menu";

/**
 * Navigatsiya:
 *  - telefon/planşet (pastki panel, mobil ilova bilan bir xil):
 *      tayyorlovchi: Asosiy · Takliflarim · Xabarlar · Hamyon · Profil
 *      buyurtmachi:  Asosiy · Buyurtmalarim · Xabarlar · Hamyon · Profil
 *    Qöllanma, Referal va Yordam — Profil sahifasining headerida ikonka.
 *  - kompyuter (chap sidebar): yuqoridagilar + Referal (tayyorlovchi) va Qöllanma.
 */
const DASHBOARD: NavLink = { href: "/dashboard", label: "Asosiy menyu", tkey: "nav.dashboard", icon: "home" };
const MESSAGES: NavLink = { href: "/messages", label: "Xabarlar", tkey: "nav.messages", icon: "message" };
const WALLET: NavLink = { href: "/wallet", label: "Hamyon", tkey: "nav.wallet", icon: "wallet" };
const PROFILE: NavLink = { href: "/profile", label: "Profil", tkey: "nav.profile", icon: "user" };

/** tayyorr+ (plus.tayyorr.uz) — menyuning eng pastida alohida kartochka (TayyorrPlusCard). */
export const TAYYORR_PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

const MY_OFFERS_LINK: NavLink = {
  href: "/offers",
  label: "Mening takliflarim",
  tkey: "nav.myOffers",
  icon: "hand",
};

const MY_ORDERS_LINK: NavLink = {
  href: "/orders",
  label: "Buyurtmalarim",
  tkey: "nav.myOrders",
  icon: "package",
};

const REFERRAL_LINK: NavLink = {
  href: "/referral",
  label: "Referal",
  tkey: "nav.referral",
  icon: "gift",
};

const GUIDE_LINK: NavLink = {
  href: "/guide",
  label: "Qöllanma",
  tkey: "nav.guide",
  icon: "help",
};

const BASE_NAV: NavLink[] = [DASHBOARD, MESSAGES, WALLET, PROFILE];

/** Pastki panel (telefon/planşet) — rolga qarab 5 ta bölim. */
export function navForRole(role: string | null | undefined): NavLink[] {
  const second = role === "PREPARER" ? MY_OFFERS_LINK : MY_ORDERS_LINK;
  return [DASHBOARD, second, MESSAGES, WALLET, PROFILE];
}

/** Kompyuterdagi chap sidebar — barça bölimlar (Referal faqat tayyorlovchiga). */
export function sidebarNavForRole(role: string | null | undefined): NavLink[] {
  if (role === "PREPARER") {
    return [DASHBOARD, MY_OFFERS_LINK, REFERRAL_LINK, MESSAGES, WALLET, PROFILE, GUIDE_LINK];
  }
  return [DASHBOARD, MY_ORDERS_LINK, MESSAGES, WALLET, PROFILE, GUIDE_LINK];
}

/** Orqaga moslik uchun — rolsiz joylarda standart ro'yxat. */
export const APP_NAV = BASE_NAV;
