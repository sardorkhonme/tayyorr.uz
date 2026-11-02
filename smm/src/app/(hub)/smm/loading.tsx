import { SBar, SBlock, SCard } from "@/components/skeleton";

export default function SmmLoading() {
  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4">
        <SBlock className="h-14 w-14 !rounded-2xl" />
        <div className="space-y-2">
          <SBar className="h-8 w-48" />
          <SBar className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="space-y-6">
        <SBar className="h-8 w-80 max-w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 7 }, (_, i) => (
            <SCard key={i} className="space-y-4 !rounded-2xl">
              <SBlock className="h-14 w-14 !rounded-2xl" />
              <SBar className="h-5 w-24" />
              <SBar className="h-3 w-16" />
            </SCard>
          ))}
        </div>
      </div>
    </div>
  );
}
