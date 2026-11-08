import { SBar, SBlock, SWrap } from "@/components/skeleton";

/** Statistika: sarlavha + davr, 9 ta KPI, chart kartalari. */
export default function StatsLoading() {
  return (
    <SWrap>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <SBar className="h-6 w-40" />
          <SBar className="h-3 w-72 max-w-full" />
        </div>
        <SBlock className="h-10 w-64 !rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <SBlock key={i} className="h-[104px] !rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SBlock key={i} className="h-[320px] !rounded-2xl" />
        ))}
      </div>
      <SBlock className="h-[300px] !rounded-2xl" />
    </SWrap>
  );
}
