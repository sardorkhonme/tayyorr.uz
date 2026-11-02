import { SBar, SRow, SWrap } from "@/components/skeleton";

export default function AdminComplaintsLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-40" />
      <SRow withAvatar={false} />
      <SRow withAvatar={false} />
      <SRow withAvatar={false} />
      <SRow withAvatar={false} />
    </SWrap>
  );
}
