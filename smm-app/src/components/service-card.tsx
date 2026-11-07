import { num, som } from "@/lib/format";
import { guaranteeLabel, guaranteeOf, isGuaranteeTag } from "@/lib/guarantee";

export type BoardService = {
  id: string;
  platform: string;
  category: string;
  name: string;
  description: string | null;
  rate: number;
  /** chegirmadan oldingi narx (faqat chegirma bo'lsa) */
  oldRate: number | null;
  /** chegirma foizi (0 — chegirma yo'q) */
  discount: number;
  min: number;
  max: number;
  refill: boolean;
};

/** "−20%" yorlig'i. */
export function DiscountBadge({ pct, className = "" }: { pct: number; className?: string }) {
  if (!pct) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-2.5 py-1 text-xs font-bold text-white shadow-md shadow-rose-500/30 ${className}`}
    >
      −{pct}%
    </span>
  );
}

/** Kafolat yorlig'i: yashil — kafolatli, sariq — kafolatsiz (qo'llanmada tushuntirilgan). */
export function GuaranteeBadge({ name, refill, className = "" }: { name: string; refill: boolean; className?: string }) {
  const g = guaranteeOf(name, refill);
  const ok = g.kind !== "none";
  return (
    <span
      title={ok ? "Kamaysa provayder qayta töldiradi" : "Kamaysa qayta töldirilmaydi"}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      } ${className}`}
    >
      {ok ? "♻️" : "⚠️"} {guaranteeLabel(g)}
    </span>
  );
}

/** Xizmat kartasi — bosh sahifada ham, chegirmalar sahifasida ham. */
export function ServiceCard({
  service: s,
  title,
  tags,
  label,
  onSelect,
}: {
  service: BoardService;
  title: string;
  tags: string[];
  /** kartaning tepasidagi kichik yozuv (masalan "Instagram · Ko'rishlar") */
  label?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card glow-card group relative flex flex-col gap-4 !rounded-2xl p-5 text-left sm:p-6 ${
        s.discount ? "ring-2 ring-rose-200" : ""
      }`}
    >
      {s.discount > 0 && <DiscountBadge pct={s.discount} className="absolute right-4 top-4 sm:right-5 sm:top-5" />}
      {label && (
        <span className={`text-xs font-semibold uppercase tracking-wide text-indigo-500 ${s.discount ? "pr-16" : ""}`}>{label}</span>
      )}
      <span
        className={`font-display text-[17px] font-semibold leading-snug text-zinc-900 ${s.discount && !label ? "pr-16" : ""}`}
      >
        {title}
      </span>
      <span className="flex flex-wrap gap-1.5 text-xs">
        {tags.filter((t) => !isGuaranteeTag(t)).slice(0, 4).map((t) => (
          <span key={t} className="rounded-full border border-zinc-200 px-2.5 py-1 text-zinc-600">
            {t}
          </span>
        ))}
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
          {num(s.min)} – {num(s.max)} ta
        </span>
        <GuaranteeBadge name={s.name} refill={s.refill} />
      </span>
      <span className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <span>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={`font-display text-2xl font-bold ${s.discount ? "text-rose-600" : "text-zinc-900"}`}>
              {som(s.rate)}
            </span>
            {s.oldRate && <span className="text-sm text-zinc-400 line-through">{som(s.oldRate)}</span>}
          </span>
          <span className="text-xs text-zinc-500">har 1000 tasi uçun</span>
        </span>
        <span className="rounded-xl bg-indigo-50 bg-[length:200%_100%] px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-all duration-500 group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:via-violet-500 group-hover:to-fuchsia-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-fuchsia-500/30">
          Tanlaş
        </span>
      </span>
    </button>
  );
}
