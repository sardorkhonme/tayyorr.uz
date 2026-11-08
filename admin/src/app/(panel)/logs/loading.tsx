import { SBar, SBlock, STableRow, SWrap } from "@/components/skeleton";

/** Loglar: sarlavha, tablar, 3 ta hisob, filtr, izlar ro'yxati. */
export default function LogsLoading() {
  return (
    <SWrap>
      <div className="space-y-2">
        <SBar className="h-6 w-28" />
        <SBar className="h-3 w-[32rem] max-w-full" />
      </div>
      <SBlock className="h-10 w-72 !rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SBlock key={i} className="h-20" />
        ))}
      </div>
      <SBlock className="h-[68px]" />
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 12 }, (_, i) => (
          <STableRow key={i} cols={4} />
        ))}
      </div>
    </SWrap>
  );
}
