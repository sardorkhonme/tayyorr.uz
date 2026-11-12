import { SBar, SCircle, SWrap } from "@/components/skeleton";

export default function OrderDetailLoading() {
  return (
    <SWrap>
      <SBar className="h-4 w-20" />
      <div className="card space-y-3">
        <div className="flex gap-2">
          <SBar className="h-6 w-24 rounded-full" />
          <SBar className="h-6 w-16 rounded-full" />
        </div>
        <SBar className="h-7 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-2 p-3.5 sm:p-4">
            <SBar className="h-3 w-16" />
            <SBar className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="card flex items-center gap-3">
        <SCircle className="h-11 w-11" />
        <div className="flex-1 space-y-2">
          <SBar className="h-3 w-20" />
          <SBar className="h-4 w-1/3" />
        </div>
      </div>
      <div className="card space-y-2">
        <SBar className="h-4 w-16" />
        <SBar className="h-3 w-full" />
        <SBar className="h-3 w-5/6" />
        <SBar className="h-3 w-2/3" />
      </div>
    </SWrap>
  );
}
