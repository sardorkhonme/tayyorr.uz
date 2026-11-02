import { SBar, STableRow, SWrap } from "@/components/skeleton";

export default function AdminUsersLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-40" />
      <SBar className="h-10 w-72" />
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 8 }).map((_, i) => (
          <STableRow key={i} cols={4} />
        ))}
      </div>
    </SWrap>
  );
}
