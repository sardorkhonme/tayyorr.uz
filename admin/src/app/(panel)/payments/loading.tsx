import { SBar, STableRow, SWrap } from "@/components/skeleton";

export default function AdminPaymentsLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-40" />
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 10 }).map((_, i) => (
          <STableRow key={i} cols={4} />
        ))}
      </div>
    </SWrap>
  );
}
