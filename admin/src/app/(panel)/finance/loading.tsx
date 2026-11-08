import { SBar, SBlock, SWrap } from "@/components/skeleton";

/** Moliya: sarlavha + davr, asosiy raqamlar, hisob-kitob jadvali, chart. */
export default function FinanceLoading() {
  return (
    <SWrap>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <SBar className="h-6 w-32" />
          <SBar className="h-3 w-80 max-w-full" />
        </div>
        <SBlock className="h-10 w-64 !rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SBlock key={i} className="h-[104px] !rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <SBlock className="h-[380px] !rounded-2xl" />
        <SBlock className="h-[380px] !rounded-2xl" />
      </div>
      <SBlock className="h-[300px] !rounded-2xl" />
    </SWrap>
  );
}
