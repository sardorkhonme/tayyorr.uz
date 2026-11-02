import { SBubble } from "@/components/skeleton";

export default function AdminMessageDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="skel h-4 w-40 rounded-md" />
      <div className="flex flex-col gap-2.5">
        <SBubble w="w-2/5" />
        <SBubble w="w-1/2" mine />
        <SBubble w="w-1/3" />
      </div>
    </div>
  );
}
