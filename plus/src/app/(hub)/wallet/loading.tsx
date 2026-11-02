import { SBar, SBlock, SCard } from "@/components/skeleton";

export default function WalletLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <SBar className="h-9 w-40" />
        <SBar className="h-4 w-96 max-w-full" />
      </div>
      <SBlock className="h-56" />
      <div className="space-y-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <SCard key={i} className="flex items-center gap-4 !rounded-2xl !p-4">
            <SBar className="h-11 w-11 shrink-0 !rounded-xl" />
            <div className="flex-1 space-y-2">
              <SBar className="h-4 w-40" />
              <SBar className="h-3 w-56 max-w-full" />
            </div>
            <SBar className="h-5 w-24" />
          </SCard>
        ))}
      </div>
    </div>
  );
}
