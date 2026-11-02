export function som(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

export function num(n: number) {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

/** 1000 dona narxidan `quantity` uchun yechiladigan summa (yuqoriga yaxlitlanadi). */
export function chargeFor(rate: number, quantity: number) {
  return Math.ceil((rate * quantity) / 1000);
}

export const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://tayyorr.uz";
/** tayyorr.uz kabineti (buyurtmalar, hamyon, admin) */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tayyorr.uz";
