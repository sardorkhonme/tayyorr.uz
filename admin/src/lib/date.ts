const MONTHS_UZ = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

// Server (Vercel) UTC'da ishlaydi, lekin biz +5 (Toshkent) zonasidamiz —
// serverda ham, brauzerda ham bir xil vaqt chiqishi uchun sanani doim
// aniq shu zonaga nisbatan o'qiymiz (Date'ning mahalliy getHours() kabi
// metodlariga tayanmaymiz, ular ishga tushgan muhitning zonasini oladi).
const TZ = "Asia/Tashkent";

interface TzParts {
  year: number;
  month: number; // 0-indeksli (JS Date konvensiyasi)
  day: number;
  hour: number;
  minute: number;
}

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function tzParts(input: Date | string | number): TzParts {
  const d = new Date(input);
  const found = Object.fromEntries(
    partsFmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(found.year),
    month: Number(found.month) - 1,
    day: Number(found.day),
    hour: Number(found.hour) % 24,
    minute: Number(found.minute),
  };
}

/** "3-mar" (joriy yildan boshqasi bo'lsa yil bilan). */
export function shortDate(input: Date | string | number): string {
  const p = tzParts(input);
  const s = `${p.day}-${MONTHS_UZ[p.month]}`;
  return p.year === tzParts(Date.now()).year ? s : `${s} ${p.year}`;
}

function hm(p: TzParts) {
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

function isToday(p: TzParts) {
  const n = tzParts(Date.now());
  return p.year === n.year && p.month === n.month && p.day === n.day;
}

/** "3-mar, 14:20" */
export function shortDateTime(input: Date | string | number): string {
  return `${shortDate(input)}, ${hm(tzParts(input))}`;
}

/** Bugun bo'lsa — faqat "14:20"; boshqa kun bo'lsa — "3-mar 14:20". */
export function smartTime(input: Date | string | number): string {
  const p = tzParts(input);
  return isToday(p) ? hm(p) : `${shortDate(input)} ${hm(p)}`;
}

/** Bugun bo'lsa — "14:20"; boshqa kun — "3-mar". */
export function smartDate(input: Date | string | number): string {
  const p = tzParts(input);
  return isToday(p) ? hm(p) : shortDate(input);
}
