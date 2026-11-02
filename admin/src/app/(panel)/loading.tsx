import { SBar, SBlock, SWrap } from "@/components/skeleton";

/** Admin bosh sahifasi (statistik kartalar) shakliga mos — pastki
 * bo'limlar o'zining aniqroq loading.tsx faylini beradi. */
export default function AdminHomeLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SBlock key={i} className="h-20" />
        ))}
      </div>
    </SWrap>
  );
}
