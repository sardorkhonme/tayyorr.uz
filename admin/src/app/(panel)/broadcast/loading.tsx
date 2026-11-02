import { SBar, SField, SWrap } from "@/components/skeleton";

export default function AdminBroadcastLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-48" />
      <div className="card space-y-4">
        <SField />
        <div className="space-y-1.5">
          <SBar className="h-3 w-20" />
          <SBar className="h-24 w-full" />
        </div>
        <SBar className="h-10 w-32" />
      </div>
    </SWrap>
  );
}
