import { SBar, SCard, SWrap } from "@/components/skeleton";

export default function MyOffersLoading() {
  return (
    <SWrap>
      <div className="flex items-center justify-between px-1">
        <SBar className="h-5 w-40" />
        <SBar className="h-3 w-10" />
      </div>
      <SCard />
      <SCard />
      <SCard />
    </SWrap>
  );
}
