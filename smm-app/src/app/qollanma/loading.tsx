import { SBar, SBlock, SCard } from "@/components/skeleton";

/** Qo'llanma: sarlavha, yorliq kartasi, 3 qoida, 4 ta kichik karta, lug'at. */
export default function GuideLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <SBlock className="h-14 w-14 !rounded-2xl" />
        <div className="space-y-2">
          <SBar className="h-8 w-40" />
          <SBar className="h-4 w-32" />
        </div>
      </div>
      <SCard className="space-y-4 !rounded-3xl">
        <SBar className="h-6 w-56" />
        <div className="grid gap-3 sm:grid-cols-2">
          <SBlock className="h-28" />
          <SBlock className="h-28" />
        </div>
      </SCard>
      <SCard className="space-y-3 !rounded-3xl">
        <SBar className="h-6 w-32" />
        {Array.from({ length: 3 }, (_, i) => (
          <SBar key={i} className="h-4 w-full" />
        ))}
      </SCard>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SBlock key={i} className="h-20 !rounded-2xl" />
        ))}
      </div>
      <SBlock className="h-72 !rounded-3xl" />
    </div>
  );
}
