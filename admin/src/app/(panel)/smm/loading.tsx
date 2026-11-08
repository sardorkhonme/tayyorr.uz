import { SBar, SBlock, STableRow, SWrap } from "@/components/skeleton";

/** tayyorr+ / SMM: hisob kartalari, sozlamalar, oxirgi buyurtmalar jadvali. */
export default function AdminSmmLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SBlock key={i} className="h-24" />
        ))}
      </div>
      <SBlock className="h-48 !rounded-2xl" />
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 8 }, (_, i) => (
          <STableRow key={i} cols={6} />
        ))}
      </div>
    </SWrap>
  );
}
