import { SBar, SWrap } from "@/components/skeleton";

export default function AdminPaymentDetailLoading() {
  return (
    <SWrap>
      <SBar className="h-4 w-32" />
      <div className="card space-y-3">
        <SBar className="h-5 w-1/3" />
        <SBar className="h-4 w-1/2" />
        <SBar className="h-4 w-2/3" />
      </div>
      <SBar className="h-10 w-40" />
    </SWrap>
  );
}
