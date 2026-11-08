import { SBar, SBlock, SCard } from "@/components/skeleton";

/** Buyurtma sahifasi: orqaga havola, rangli sarlavha + halqa, 6 ta statistika, jarayon. */
export default function OrderLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <SBar className="h-4 w-36" />
      <SCard className="mt-4 !rounded-3xl !p-0">
        <SBlock className="h-28 !rounded-none !rounded-t-3xl" />
        <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-7">
          <SBlock className="h-32 w-32 shrink-0 !rounded-full sm:h-36 sm:w-36" />
          <div className="w-full flex-1 space-y-3">
            <SBar className="h-7 w-40" />
            <SBar className="h-4 w-64 max-w-full" />
            <SBlock className="h-2.5 !rounded-full" />
            <SBar className="h-8 w-32 !rounded-full" />
          </div>
        </div>
      </SCard>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SCard key={i} className="space-y-2 !p-4">
            <SBar className="h-3 w-20" />
            <SBar className="h-6 w-24" />
            <SBar className="h-3 w-16" />
          </SCard>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SBlock className="h-64 !rounded-2xl" />
        <SBlock className="h-64 !rounded-2xl" />
      </div>
    </div>
  );
}
