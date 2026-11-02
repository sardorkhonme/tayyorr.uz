import { SBar, SBlock, SWrap } from "@/components/skeleton";

export default function AdminLandingLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-40" />
      <SBlock className="h-40 w-full" />
      <SBlock className="h-32 w-full" />
    </SWrap>
  );
}
