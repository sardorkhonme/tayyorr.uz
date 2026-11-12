import type { NavLink } from "@/components/nav-menu";

/**
 * Asosiy navigatsiya (mobil ilovadagi pastki menyu bilan bir xil):
 *  - tayyorlovchi: Asosiy · Takliflarim · Xabarlar · Hamyon · Profil
 *  - buyurtmachi:  Asosiy · Buyurtmalarim · Xabarlar · Hamyon · Profil
 * Qöllanma, Referal va Yordam — Profil sahifasining headerida ikonka.
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

const BASE_NAV: NavLink[] = [DASHBOARD, MESSAGES, WALLET, PROFILE];

/** Rolga qarab navigatsiya ro'yxati. */
export function navForRole(role: string | null | undefined): NavLink[] {
  const second = role === "PREPARER" ? MY_OFFERS_LINK : MY_ORDERS_LINK;
  return [DASHBOARD, second, MESSAGES, WALLET, PROFILE];
}

/** Orqaga moslik uchun — rolsiz joylarda standart ro'yxat. */
export const APP_NAV = BASE_NAV;
