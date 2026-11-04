/** To'lov qaysi platformadan boshlangani — qaytish manzili domenidan aniqlanadi. */
export function payPlatform(returnTo: string): { key: "app" | "smm" | "plus"; label: string } {
  let host = "";
  try {
    host = new URL(returnTo).hostname.toLowerCase();
  } catch {
    /* noto'g'ri URL */
  }
  if (host.startsWith("app.")) return { key: "app", label: "Tayyorr.uz" };
  if (host.startsWith("smm.")) return { key: "smm", label: "Tayyorr SMM" };
  return { key: "plus", label: "tayyorr+" };
}

export const PAY_METHODS = [
  { key: "click", name: "Click", logo: "/pay/click.svg", logoClass: "h-7", showName: false, ready: true },
  { key: "payme", name: "Payme", logo: "/pay/payme.svg", logoClass: "h-6", showName: false, ready: false },
  { key: "uzum", name: "Uzum Bank", logo: "/pay/uzum.png", logoClass: "h-10 rounded-xl", showName: true, ready: false },
] as const;

export type PayMethod = (typeof PAY_METHODS)[number]["key"];
