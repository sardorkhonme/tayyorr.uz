import { SBar, SBlock, SCard } from "@/components/skeleton";

/** Support chati: sarlavha, xabarlar, yozish maydoni. */
export default function SupportLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SBar className="h-8 w-40" />
      <SCard className="space-y-4 !rounded-3xl">
        {["w-2/3", "ml-auto w-1/2", "w-3/5", "ml-auto w-2/5", "w-1/2"].map((w, i) => (
          <SBlock key={i} className={`h-12 !rounded-2xl ${w}`} />
        ))}
        <SBlock className="h-12 !rounded-2xl" />
      </SCard>
    </div>
  );
}
