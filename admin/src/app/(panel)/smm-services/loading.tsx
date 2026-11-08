import { SBar, SBlock, STableRow, SWrap } from "@/components/skeleton";

/** SMM xizmatlari: filtrlar va xizmatlar jadvali. */
export default function AdminSmmServicesLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-44" />
      <SBlock className="h-12" />
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 12 }, (_, i) => (
          <STableRow key={i} cols={5} />
        ))}
      </div>
    </SWrap>
  );
}
