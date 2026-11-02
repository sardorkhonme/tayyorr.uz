import type { MessageSource } from "@/lib/message-source";

/** Admin uchun: xabar qaysi tizimdan yozilgani (foydalanuvchiga ko'rsatilmaydi). */
export function MessageSourceBadge({ source }: { source?: MessageSource }) {
  const plus = source === "tayyorr+";
  const both = source === "ikkalasi";
  return (
    <span
      title="Xabar yozilgan tizim (faqat adminga ko'rinadi)"
      className={`mr-1.5 inline-flex items-center rounded-full px-1.5 py-px align-middle text-[9px] font-semibold leading-tight ${
        plus
          ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
          : both
            ? "bg-emerald-500/80 text-white"
            : "bg-black/20 text-current opacity-80"
      }`}
    >
      {source ?? "tayyorr.uz"}
    </span>
  );
}
