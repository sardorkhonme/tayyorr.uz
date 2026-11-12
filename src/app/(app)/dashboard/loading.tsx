import { SBar, SBlock, SCard, SWrap } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <SWrap>
      <SBlock className="h-36 w-full" />
      <div className="flex items-center justify-between px-1">
        <SBar className="h-5 w-32" />
        <SBar className="h-3 w-10" />
      </div>
      <SCard />
      <SCard />
      <SCard />
    </SWrap>
  );
}
