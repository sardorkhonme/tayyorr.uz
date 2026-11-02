import { SBlock, SBar, STableRow, SWrap } from "@/components/skeleton";

export default function AdminReferralDetailLoading() {
  return (
    <SWrap>
      <SBar className="h-4 w-32" />
      <SBlock className="h-20 w-full" />
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 5 }).map((_, i) => (
          <STableRow key={i} cols={3} />
        ))}
      </div>
    </SWrap>
  );
}
