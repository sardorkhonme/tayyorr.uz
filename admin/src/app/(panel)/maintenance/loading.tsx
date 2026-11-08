import { SBar, SBlock, SRow, SWrap } from "@/components/skeleton";

/** Texnik ishlar: holat kartasi, ruxsat ro'yxati, xabar. */
export default function MaintenanceLoading() {
  return (
    <SWrap>
      <div className="space-y-2">
        <SBar className="h-6 w-56" />
        <SBar className="h-3 w-[36rem] max-w-full" />
      </div>
      <SBlock className="h-[104px] !rounded-2xl" />
      <div className="space-y-3 rounded-2xl border border-white/10 p-5">
        <SBar className="h-5 w-64" />
        <SBlock className="h-10" />
        {Array.from({ length: 3 }, (_, i) => (
          <SRow key={i} />
        ))}
      </div>
      <SBlock className="h-40 !rounded-2xl" />
    </SWrap>
  );
}
