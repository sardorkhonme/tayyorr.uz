import { platformsOf, sourceLabel, type MessageSource } from "@/lib/message-source";

/** Admin uchun: xabar qaysi platforma(lar)ga tegishli (foydalanuvchiga ko'rsatilmaydi). */
export function MessageSourceBadge({ source }: { source?: MessageSource }) {
  const ps = platformsOf(source);
  const cls =
    source === "ikkalasi"
      ? "bg-emerald-500/80 text-white"
      : ps.length === 1 && ps[0] === "uz"
        ? "bg-black/20 text-current opacity-80"
        : ps.length === 1 && ps[0] === "smm"
          ? "bg-gradient-to-r from-rose-500 to-orange-400 text-white"
          : ps.length === 1
            ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
            : "bg-sky-500/80 text-white";
  return (
    <span
      title="Xabar ko'rinadigan platforma(lar) — faqat adminga ko'rinadi"
      className={`mr-1.5 inline-flex items-center rounded-full px-1.5 py-px align-middle text-[9px] font-semibold leading-tight ${cls}`}
    >
      {sourceLabel(source)}
    </span>
  );
}
