import { SBar, SBlock, SCard, SHeading } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <SHeading />
      <div className="grid gap-5 md:grid-cols-2">
        <SCard className="space-y-4">
          <SBlock className="h-14 w-14 !rounded-2xl" />
          <SBar className="h-7 w-40" />
          <SBar className="h-4 w-full" />
          <SBar className="h-4 w-2/3" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <SBar key={i} className="h-9 w-9 !rounded-xl" />
            ))}
          </div>
        </SCard>
        <SBlock className="min-h-56" />
      </div>
      <SCard className="space-y-4">
        <SBar className="h-5 w-48" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SBar className="h-9 w-9 !rounded-xl" />
            <div className="flex-1 space-y-2">
              <SBar className="h-4 w-1/2" />
              <SBar className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </SCard>
    </div>
  );
}
