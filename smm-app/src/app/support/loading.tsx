import { SBar, SCircle } from "@/components/skeleton";

export default function SupportLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <SCircle />
        <div className="space-y-2">
          <SBar className="h-4 w-32" />
          <SBar className="h-3 w-48" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <SBar className="h-12 w-2/3 !rounded-2xl" />
        <SBar className="ml-auto h-10 w-1/2 !rounded-2xl" />
        <SBar className="h-16 w-3/4 !rounded-2xl" />
      </div>
      <div className="border-t border-zinc-100 p-3">
        <SBar className="h-12 w-full !rounded-xl" />
      </div>
    </div>
  );
}
