import { SBar, SBlock, SWrap } from "@/components/skeleton";

/** Moliya: sarlavha + davr, ikki katta karta ("qancha ishladim", "pulim qayerda"), chart, pul tashlash. */
export default function FinanceLoading() {
  return (
    <SWrap>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <SBar className="h-6 w-32" />
          <SBar className="h-3 w-64 max-w-full" />
        </div>
        <SBlock className="h-10 w-64 !rounded-xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <SBlock className="h-[400px] !rounded-2xl" />
        <SBlock className="h-[400px] !rounded-2xl" />
      </div>
      <SBlock className="h-[320px] !rounded-2xl" />
      <SBlock className="h-48 !rounded-2xl" />
    </SWrap>
  );
}
