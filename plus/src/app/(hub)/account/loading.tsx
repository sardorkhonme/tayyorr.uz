import { SBar, SBlock } from "@/components/skeleton";

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <SBar className="h-9 w-40" />
        <SBar className="h-4 w-80 max-w-full" />
      </div>
      <SBlock className="h-36" />
      <div className="grid gap-3 sm:grid-cols-2">
        <SBlock className="h-20" />
        <SBlock className="h-20" />
      </div>
    </div>
  );
}
