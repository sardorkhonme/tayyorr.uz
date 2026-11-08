import { SBar, SBlock, SCard } from "@/components/skeleton";

/** Chegirmalar: sarlavha, qo'llanma havolasi, chegirmali xizmat kartalari. */
export default function DiscountsLoading() {
  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <SBlock className="h-14 w-14 !rounded-2xl" />
        <div className="space-y-2">
          <SBar className="h-8 w-44" />
          <SBar className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <SBlock className="h-12 !rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SCard key={i} className="space-y-4 !rounded-2xl">
            <SBar className="h-3 w-28" />
            <SBar className="h-5 w-3/4" />
            <div className="flex gap-1.5">
              <SBar className="h-6 w-16 !rounded-full" />
              <SBar className="h-6 w-20 !rounded-full" />
              <SBar className="h-6 w-24 !rounded-full" />
            </div>
            <div className="flex items-end justify-between border-t border-zinc-100 pt-4">
              <SBar className="h-7 w-28" />
              <SBar className="h-10 w-20 !rounded-xl" />
            </div>
          </SCard>
        ))}
      </div>
    </div>
  );
}
