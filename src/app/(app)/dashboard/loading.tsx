import { SBar, SBlock, SCard, SWrap } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <SWrap>
      <SBlock className="h-36 w-full" />
      {/* kompyuter: qidiruv + filtr qutisi */}
      <div className="hidden flex-col gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] p-3 lg:flex">
        <SBar className="h-6 w-40" />
        <div className="flex items-center gap-2">
          <SBar className="h-10 flex-1" />
          <SBar className="h-10 w-24" />
        </div>
      </div>
      <div className="flex items-center justify-between px-1 lg:hidden">
        <SBar className="h-5 w-32" />
        <SBar className="h-3 w-10" />
      </div>
      <SCard />
      <SCard />
      <SCard />
    </SWrap>
  );
}
