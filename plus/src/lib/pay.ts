/** To'lov qaysi platformadan boshlangani — qaytish manzili domenidan aniqlanadi. */
export function payPlatform(returnTo: string): { key: "app" | "smm" | "plus"; label: string } {
  let host = "";
  try {
    host = new URL(returnTo).hostname.toLowerCase();
  } catch {
    /* noto'g'ri URL */
  }
  if (host.startsWith("app.")) return { key: "app", label: "Ilmiy ishlar" };
  if (host.startsWith("smm.")) return { key: "smm", label: "Tayyorr SMM" };
  return { key: "plus", label: "tayyorr+" };
}

export const PAY_METHODS = [
  { key: "click", name: "Click", color: "#0080ff", ready: true },
  { key: "payme", name: "Payme", color: "#00b8c2", ready: false },
  { key: "uzum", name: "Uzum Bank", color: "#7000ff", ready: false },
] as const;

export type PayMethod = (typeof PAY_METHODS)[number]["key"];
