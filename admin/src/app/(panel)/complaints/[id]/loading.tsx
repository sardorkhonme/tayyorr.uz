import { SBar, SBlock, SWrap } from "@/components/skeleton";

export default function AdminComplaintDetailLoading() {
  return (
    <SWrap>
      <SBar className="h-4 w-32" />
      <SBlock className="h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <SBlock className="h-32" />
        <SBlock className="h-32" />
      </div>
    </SWrap>
  );
}
