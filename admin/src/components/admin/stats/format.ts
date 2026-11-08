/** Raqam formati — server (Moliya, Statistika) va brauzer (chartlar) uchun umumiy. */
export type Fmt = "count" | "som";

const nf = new Intl.NumberFormat("ru-RU");

export function fmtValue(v: number, f: Fmt) {
  return f === "som" ? `${nf.format(Math.round(v))} söm` : nf.format(Math.round(v));
}
