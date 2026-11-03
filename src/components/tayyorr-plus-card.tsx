import { Icon } from "@/components/icons";
import { TAYYORR_PLUS_URL } from "@/lib/nav";

/** Menyuning eng pastidagi tayyorr+ kartochkasi — gradient fon, ajralib turadi. */
export function TayyorrPlusCard({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={TAYYORR_PLUS_URL}
      className={`plus-card group relative flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-[#fff] shadow-lg shadow-fuchsia-500/20 transition hover:shadow-fuchsia-500/40 ${
        compact ? "px-3 py-2.5" : "p-3"
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fff] shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/plus-mark.png" alt="" className="h-6 w-6 object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-bold leading-tight">
          tayyorr<span className="text-amber-200">+</span>
        </span>
        <span className="block truncate text-[11px] text-white/80">SMM va boşqalar</span>
      </span>
      <Icon name="arrow-up" className="h-4 w-4 rotate-45 opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
