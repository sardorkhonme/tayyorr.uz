import Link from "next/link";

import { Icon } from "@/components/icons";

/** Bosh sahifadagi "chegirmalar" banneri — faqat chegirmali xizmat bo'lsa ko'rinadi. */
export function SaleBanner({ count, max }: { count: number; max: number }) {
  return (
    <Link
      href="/chegirmalar"
      className="shine group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 p-5 text-white shadow-xl shadow-fuchsia-500/25 sm:p-6"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 sm:h-14 sm:w-14">
        <Icon name="tag" className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl font-bold sm:text-2xl">−{max}% gaça çegirmalar!</span>
        <span className="block text-sm text-white/85">
          {count} ta xizmat arzonlaşdi — ulgurib qoling
        </span>
      </span>
      <span className="hidden items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-fuchsia-700 sm:inline-flex">
        Köriş
        <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
      <Icon name="arrow-right" className="h-5 w-5 shrink-0 sm:hidden" />
    </Link>
  );
}
