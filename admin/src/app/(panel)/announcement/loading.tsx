import { SBar, SField, SWrap } from "@/components/skeleton";

export default function AdminAnnouncementLoading() {
  return (
    <SWrap>
      <SBar className="h-6 w-48" />
      <div className="card space-y-4">
        <SField />
        <SField />
        <SBar className="h-10 w-32" />
      </div>
    </SWrap>
  );
}
