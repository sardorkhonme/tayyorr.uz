import { SBar, SBlock, SWrap } from "@/components/skeleton";

/** SMM buyurtma: sarlavha + progress + 6 ta raqam, keyin 2×3 panel. */
export default function AdminSmmOrderLoading() {
  return (
    <SWrap>
      <SBar className="h-4 w-40" />
      <div className="space-y-4 rounded-2xl border border-white/10 p-5">
        <SBar className="h-3 w-48" />
        <SBar className="h-6 w-3/4" />
        <SBlock className="h-2.5 !rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <SBlock key={i} className="h-16" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid gap-6 lg:grid-cols-2">
          <SBlock className="h-64 !rounded-2xl" />
          <SBlock className="h-64 !rounded-2xl" />
        </div>
      ))}
    </SWrap>
  );
}
