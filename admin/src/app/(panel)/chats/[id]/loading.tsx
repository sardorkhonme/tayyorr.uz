import { SBubble } from "@/components/skeleton";

export default function AdminChatDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center gap-3">
        <div className="skel h-4 w-48 rounded-md" />
      </div>
      <div className="flex flex-col gap-2.5">
        <SBubble w="w-2/5" />
        <SBubble w="w-1/2" mine />
        <SBubble w="w-3/5" />
        <SBubble w="w-2/5" mine />
      </div>
    </div>
  );
}
