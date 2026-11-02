import { SBar, SCard } from "@/components/skeleton";

export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <SBar className="h-9 w-56" />
        <SBar className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <SCard key={i} className="flex gap-4 !p-5">
            <SBar className="h-11 w-11 shrink-0 !rounded-xl" />
            <div className="flex-1 space-y-2.5">
              <div className="flex justify-between gap-3">
                <SBar className="h-4 w-1/2" />
                <SBar className="h-6 w-20 !rounded-full" />
              </div>
              <SBar className="h-3 w-2/3" />
              <SBar className="h-3 w-1/3" />
            </div>
          </SCard>
        ))}
      </div>
    </div>
  );
}
