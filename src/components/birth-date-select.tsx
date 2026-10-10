"use client";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const THIS_YEAR = new Date().getFullYear();
// 10 yoshdan 100 yoshgacha
const YEARS = Array.from({ length: 91 }, (_, i) => THIS_YEAR - 10 - i);

function daysIn(year: number, month: number) {
  return new Date(year || 2000, month || 1, 0).getDate();
}

export interface BirthParts {
  d: string;
  m: string;
  y: string;
}

/** "2004-03-15" → { d: "15", m: "3", y: "2004" } */
export function birthPartsFrom(iso: string | null | undefined): BirthParts {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) } : { d: "", m: "", y: "" };
}

/** { d, m, y } → "YYYY-MM-DD" yoki to'liq bo'lmasa null */
export function birthPartsToIso(b: BirthParts): string | null {
  if (!b.d || !b.m || !b.y) return null;
  return `${b.y}-${b.m.padStart(2, "0")}-${b.d.padStart(2, "0")}`;
}

/** Kun / Oy / Yil — uchta ro'yxat (ro'yxatdan o'tish va profil uchun). */
export function BirthDateSelect({
  value,
  onChange,
  required,
}: {
  value: BirthParts;
  onChange: (v: BirthParts) => void;
  required?: boolean;
}) {
  const setPart = (patch: Partial<BirthParts>) => {
    const next = { ...value, ...patch };
    const max = daysIn(Number(next.y), Number(next.m));
    if (Number(next.d) > max) next.d = "";
    onChange(next);
  };
  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
      <select className="input" required={required} value={value.d} onChange={(e) => setPart({ d: e.target.value })}>
        <option value="">Kun</option>
        {Array.from({ length: daysIn(Number(value.y), Number(value.m)) }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>
            {i + 1}
          </option>
        ))}
      </select>
      <select className="input" required={required} value={value.m} onChange={(e) => setPart({ m: e.target.value })}>
        <option value="">Oy</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1)}>
            {name}
          </option>
        ))}
      </select>
      <select className="input" required={required} value={value.y} onChange={(e) => setPart({ y: e.target.value })}>
        <option value="">Yil</option>
        {YEARS.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
