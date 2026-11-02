import { SBar, SBlock, SWrap } from "@/components/skeleton";

export default function AdminOrderDetailLoading() {
  return (
    <SWrap>
      <SBar className="h-4 w-32" />
      <SBar className="h-6 w-1/2" />
      <SBlock className="h-24 w-full" />
      <SBlock className="h-32 w-full" />
      <SBlock className="h-32 w-full" />
    </SWrap>
  );
}
